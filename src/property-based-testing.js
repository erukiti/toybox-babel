const template = require('babel-template')
const {parse} = require('babylon')
const {transform} = require('@babel/core')
const prettier = require('prettier')

const assert = require('assert')

const src = `
function hoge(a: string) {
  return a + 'hoge'
}
`

const plugin = babel => {
  const visitor = {
    Function: {
      exit: (nodePath, state) => {
        console.log(nodePath.node)
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
