const template = require('@babel/template')
const {parse} = require('babylon')
const {transform, File} = require('@babel/core')
const {default: traverse, visitors, NodePath, Hub, Scope} = require('@babel/traverse')
const prettier = require('prettier')
const generate = require('@babel/generator').default
const assert = require('assert')
const MersenneTwister = require('mersenne-twister')


const src = 
`test('hoge property based testing', t => {
  t.true(forAll('hoge'))
})
`

const generators = {}

generators['ascii_char'] = (rand) => {
  return String.fromCharCode(rand.ranges([0x20, 0x7e]))
}
generators['string'] = (generator, rand, maxLength) => {
  const result = []
  for (let i = 0; i < maxLength; i++) {
    result.push(generator(rand))
  }
  return result.join('')
}

const source =
`function hoge(a: string) {
  return a + 'hoge'
}

contract(hoge, {
  input: (a: string) => a.length > 0,
  output: (a: string, result: string, error: Error) => {
    assert(error === null)
    assert(result === a + 'hoge')
  }
})
`


const parseMainSource = (filename) => {
  // const source = fs.readFileSync(filename).toString()
  const result = {}

  const visitor = parseMainSourceVisitor
  const ast = parse(source, {plugins: ['flow'], sourceFileName: filename, sourceType: 'module'})
  const file = new File({}, {code: source, ast})
  traverse(file.ast, visitor, file.scope, {result})
  return result
}



const plugin = babel => {

  const visitor = {
    CallExpression: (nodePath, state) => {
      if (nodePath.node.callee.type !== 'Identifier' || nodePath.node.callee.name !== 'forAll') {
        return
      }

      assert(nodePath.node.arguments.length >= 1)
      assert(nodePath.node.arguments[0].type === 'StringLiteral')
      const name = nodePath.node.arguments[0].value
      assert(name in definitions)
      console.log(definitions[name])

      // hoge.__property__.js がない場合作る
      // ある場合、paramsFromGenerated が足りなければ追加する
    }
  }
  return {
    inherits: require('@babel/plugin-syntax-flow').default,
    visitor
  }
}

let {code} = transform(src, {plugins: [plugin]})
// code = prettier.format(code)
// console.log(code)
