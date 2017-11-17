const assert = require('assert')

const parseFunctionParams = nodePath => {
  assert(nodePath.isFunction())

  const parseParamFromIdentifier = paramPath => {
    assert(paramPath.type === 'Identifier')
    const result:any = {
      name: paramPath.node.name
    }
    if (paramPath.node.typeAnnotation) {
      result.type = paramPath.get('typeAnnotation.typeAnnotation').getSource()
    }
    return result
  }

  return nodePath.get('params').map(param => {
    switch(param.type) {
      case 'AssignmentPattern': {
        return parseParamFromIdentifier(param.get('left'))
      }
      case 'Identifier': {
        return parseParamFromIdentifier(param)
      }
      default: {
        throw new Error(param)
      }
    }
  })
}

module.exports = {parseFunctionParams}
