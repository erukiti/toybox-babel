import * as fs from 'fs'
const assert = require('assert')
const {parseFunctionParams} = require('./helper')

const cogenTemplate =
`
function cogen_length(hint) {
  return (rand) => {
    const minLength = hint.minLength || 0
    const maxLength = hint.maxLength || 1000 * 1000 * 1000 * 10
    return rand.rangeInt(minLength, maxLength)
  }
}

function cogen_char(hint) {
  return (rand) => {
    const minCodePoint = hint.minCodePoint || 0
    const maxCodePoint = hint.maxCodePoint || 0x10ffff
    return String.fromCodePoint(rand.rangeInt(minCodePoint, maxCodePoint))
  }
}

function cogen_string(hint) {
  return (char, length) => {
    const result = []
    for (let i = 0; i < length(); i++) {
      result.push(charGenerator())
    }
    return result.join('')
  }
}
`

/*
function cogen_rand(hint) {
  return (seed) => {
    const mt = new MesenneTwitter(seed)
    return {
      rangeInt: (min, max) => {
        Math.floor(mt.random_incl() * (max - min)) + min
      }
    }
  }
}
*/

const plugin = (meta, opts) => {

  const createGenerator = (params) => {
    const cogen = {}
    const visitor = {
      FunctionDeclaration: (nodePath) => {
        assert(nodePath.node.id.type === 'Identifier')
        if (nodePath.node.id.name.substr(0, 6) !== 'cogen_') {
          console.log(`ignored: ${nodePath.node.id.name}`)
          return
        }
        const index = nodePath.node.body.body.findIndex(node => node.type === 'ReturnStatement')
        const retPath = nodePath.get(`body.body.${index}`)
        assert(retPath.get('argument').isFunction())
        const args = retPath.node.argument.params.map(param => {
          assert(param.type === 'Identifier')
          return param.name
        })
        cogen[nodePath.node.id.name.substr(6)] = args
      }
    }
    meta.traverseSource(cogenTemplate, visitor)

    params.forEach(param => {
      const solved = ['seed', 'rand']

      if (solved.includes(param.type)) {
        return
      }

      const unsolved = [param.type]
      let arr = [`cogen_${param.type}`]

      // while (unsolved.length > 0) {
        console.log(solved, unsolved, arr)

        const targetType = unsolved.shift()
        cogen[targetType].forEach(arg => {
          const name = arg.substr(-8) === 'Generator' ? arg.substr(arg.length - 8) : arg
          const funcName = `cogen_${name}`
          if (name in solved) {
            arr = arr.filter(value => value != funcName)
          } else {
            solved.push(name)
          }
          arr.unshift(`cogen_${name}`)
          cogen[name]
            .filter(arg => !solved.includes(arg) && !unsolved.includes(arg))
            .forEach(arg => unsolved.push(arg))
        })


      // }
      console.log(solved, unsolved, arr)
    })


  }

  const func = (source, fileName, inputType, outputType) => {
    createGenerator([{name: 'a' ,type: 'string'}])
    process.exit(0)


    const parseMainSourceVisitor = {
      FunctionDeclaration: (nodePath, state) => {
        const params = parseFunctionParams(nodePath)
        const obj:any = {params}
        if (nodePath.node.returnType) {
          obj.returnType = nodePath.get('returnType.typeAnnotation').toSource()
        }
        state.result[nodePath.node.id.name] = obj
      },
      CallExpression: (nodePath, state) => {
        if (nodePath.node.callee.type !== 'Identifier' || nodePath.node.callee.name !== 'contract') {
          return
        }
        assert(nodePath.node.arguments.length === 2)
        assert(nodePath.node.arguments[0].type === 'Identifier')
        const {name} = nodePath.node.arguments[0]
        assert(name in state.result)
        assert(typeof state.result[name] === 'object')
    
        assert(nodePath.node.arguments[1].type === 'ObjectExpression')
        nodePath.get('arguments.1.properties').forEach(propPath => {
          assert(propPath.type === 'ObjectProperty')
          assert(propPath.node.key.type === 'Identifier')
          const key = propPath.node.key.name
    
          if (['input', 'output'].indexOf(key) === -1) {
            const {start} = nodePath.node.loc
            console.log(`${fileName}:${start.line}:${start.column}: contract ${name}: unknown object key ${key}`)
            return
          }
    
          state.result[name][key] = nodePath.get('value')
        })
      }
    }

    const mainFilename = fileName.replace('.test.', '.')
    const propFilename = fileName.replace('.test.', '.__props__.')
    console.log(mainFilename)
    if (!fs.existsSync(mainFilename)) {
      return source
    }
    console.log(fileName)
    
    const result = {}
    meta.traverseFile(mainFilename, parseMainSourceVisitor, {result})
    console.log(result)

    const templ =
`// GENERATED!!
// ver: 1


export const ${name} = {
  paramgsGenerator: 
}
`

    const ast = meta.template(templ)()

    return source
  }

  return {
    name: 'test',
    func,
    inputTypes: ['.ts'],
    outputTypes: ['.ts']
  }
}

export default plugin
