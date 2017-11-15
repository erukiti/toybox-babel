const template = require('@babel/template')
const {parse} = require('babylon')
const {transform} = require('@babel/core')
const prettier = require('prettier')
const generate = require('@babel/generator').default
const assert = require('assert')

const src = 
`function hoge(a: string) {
  return a + 'hoge'
}
`

const templTest = 
`const MersenneTwister = require('mersenne-twister')
const assert = require('assert')

const hogeParamCreator = (seed) => {
  paramGenerators = []
  GENERATORS
  return paramGenerators.map(paramGenerator => paramGenerator())
}

function hoge(a) {
  return a + 'hoge'
}

for (let i = 0; i < 18; i++) {
  const params = hogeParamCreator(i)
  const res = hoge(...params)
  assert(params[0] + 'hoge' === res)
}
`

const plugin = babel => {
  const hogeParam = nodePath => {
    assert(nodePath.type === 'Identifier')
    const result = {
      name: nodePath.node.name
    }
    if (nodePath.node.typeAnnotation) {
      result.type = nodePath.get('typeAnnotation.typeAnnotation').getSource()
    }
    return result
  }

  const generators = {}

  generators['string'] = (hint = {}) => {
    const maxLength = hint.maxLength || 1000 * 1000 * 1000
    return `
paramGenerators.push(() => {
  const rand = new MersenneTwister(seed)
  const strGenerate = (len, ranges) => {
    let rangeLength = 0
    ranges.forEach(range => rangeLength += range.end - range.start + 1)

    let result = ''
    for (let i = 0; i < len; i++) {
      let n = Math.floor(rand.random() * rangeLength)
      ranges.find(range => {
        const len = range.end - range.start + 1
        if (len < n) {
          n -= len
          return false
        }

        result += String.fromCharCode(range.start + n)
        return true
      })
    }

    return result
  }

  const table = [
    'hoge', '', 'null', 'undefined', 'hogeFuga', 'hoge fuga', 'ほげ', '🐟📖🥖㉿♑️😀'
  ]

  if (seed < table.length) {
    return table[seed]
  } else if (table.length + 10) {
    let n = seed - table.length
    while (n > 1) {
      n = Math.floor(Math.sqrt(n))
    }

    return strGenerate(n, [{start: 0x41, end: 0x5a}, {start: 0x61, end: 0x7a}])
  }
})
`
  }

  const visitor = {
    Function: {
      exit: (nodePath, state) => {
        const params = nodePath.get('params').map(param => {
          let hoge = null
          switch(param.type) {
            case 'AssignmentPattern': {
              return hogeParam(param.get('left'))
            }
            case 'Identifier': {
              return hogeParam(param)
              break
            }
            default: {
              throw new Error(param)
            }
          }
        })

        console.log(params)

        const GENERATORS = template.default(params.map(param =>{
          return generators[param.type]()
        }).join('\n'))()
        const ast = template.program(templTest)({GENERATORS})
        const {code} = generate(ast)
        console.log(code)
      }
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
