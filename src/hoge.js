function hoge(a: string) {
  return a + 'hoge'
}

contract(hoge, {
  input: {
    validate: (a: string) => {

    },
    rule: {
      minCodePoint: 0x20,
      maxCodePoint: 0x10ffff,
      minLength: 1,
      maxLength: 10,
    }
  },
  output: (a: string, result, error: Error) => {
    assert(error === null)
    assert(typeof result === 'string')
    assert(result === a + 'hoge')
  }
})
