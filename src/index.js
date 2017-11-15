const template = require('babel-template')
const {parse} = require('babylon')
const {transform} = require('@babel/core')
const prettier = require('prettier')

const assert = require('assert')

const src =
`/**
 * @hoge fuga - piyo
 * @param {string} a
 */
function hoge(a: number): number {
  return a
}

/* hoge */
function fuga(a: string): string {
  return a
}
`

const getJsDoc = (comment) => {
  assert(typeof comment === 'object')
  const result = []
  if (comment.type !== 'CommentBlock' || comment.value.substr(0, 1) !== '*') {
    return null
  }

  comment.value.split('\n')
  .map(line => line.trim())
  .forEach(line => {
    result.push(line.replace(/^\*/, '').trim())
  })
  return result.join('\n')
}

const addJsDoc = (nodePath, text) => {
  const comments = ['*', ...text.split('\n').map(line => ` * ${line}`), ' ']
  nodePath.addComment('leading', comments.join('\n'))
}

const plugin = (babel) => {
  const toParam = nodePath => {
    assert(nodePath.type === 'Identifier')
    const result = {
      type: 'param',
      name: nodePath.node.name,
      comment: ' -'
    }

    if (nodePath.node.typeAnnotation) {
      result.typeAnnotation = nodePath.get('typeAnnotation.typeAnnotation').getSource()
    }
    return result
  }

  const parseFunctionNode = (nodePath) => {
    const result = []
    nodePath.get('params').forEach(param => {
      switch (param.type) {
        case 'AssignmentPattern': {
          result.push(toParam(param.get('left')))
          break
        }
        case 'Identifier': {
          result.push(toParam(param))
          break
        }
        default: {
          throw new Error(param)
        }

      }
    })

    if (nodePath.node.returnType) {
      result.push({
        type: 'return',
        name: '',
        comment: '',
        typeAnnotation: nodePath.get('returnType.typeAnnotation').getSource(),
      })
    }

    return result
  }

  const re = /^@([a-z]+)[ \t]*(\{[^}]+\})?[ \t]*([a-zA-Z]+)(.*)/

  const visitor = {
    Function: {
      exit: (nodePath, state) => {
        let parsedJsDoc = parseFunctionNode(nodePath)
        let comments = []

        if (nodePath.getStatementParent().node.leadingComments) {
          const oldComments = nodePath.getStatementParent().node.leadingComments
          assert(Array.isArray(oldComments))
          assert(oldComments.length > 0)
          const jsDoc = getJsDoc(oldComments[oldComments.length - 1])
          if (jsDoc) {
            comments = jsDoc.split('\n').map(line => {
              const matched = re.exec(line)
              if (!matched) {
                return line
              }
              const found = parsedJsDoc.find(found => {
                if (found.type !== matched[1]) {
                  return false
                }
  
                return !found.name || found.name === matched[3]
              })
              if (!found) {
                return line
              }
              parsedJsDoc = parsedJsDoc.filter(parsed => JSON.stringify(parsed) !== JSON.stringify(found))
              return `@${matched[1]} ${found.typeAnnotation} ${matched[3]}${matched[4] || ' -'}`
            })
  
            if (comments[0] === '') {
              comments.shift()
            }
            if (comments.length > 0 && comments[comments.length - 1] === '') {
              comments.pop()
            }
  
            nodePath.getStatementParent().node.leadingComments.pop()
          }
        }
        parsedJsDoc.forEach(parsed => {
          comments.push(`@${parsed.type} {${parsed.typeAnnotation}} ${parsed.name}${parsed.comment}`)
        })

        addJsDoc(nodePath.getStatementParent(), comments.join('\n'))
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
console.log(code)

