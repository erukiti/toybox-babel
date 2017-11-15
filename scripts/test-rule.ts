const plugin = (meta, opts) => {
  const func = (source, fileName, inputType, outputType) => {
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
