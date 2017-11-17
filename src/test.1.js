const MesenneTwitter = require('mersenne-twister')
const assert = require('assert')

function genRand(hint, seed) {
  const mt = new MesenneTwitter(seed)
  return {
    rangeInt: (min, max) => {
      return Math.floor(mt.random_incl() * (max - min)) + min
    }
  }
}

function cogen_length(hint, rand) {
  const minLength = hint.minLength || 0
  const maxLength = hint.maxLength || 100 // 1000 * 1000 * 10
  return () => rand.rangeInt(minLength, maxLength)
}

function cogen_char(hint, rand) {
  const minCodePoint = hint.minCodePoint || 0x20
  const maxCodePoint = hint.maxCodePoint || 0x7e // 0x10ffff
  return () => String.fromCodePoint(rand.rangeInt(minCodePoint, maxCodePoint))
}

function cogen_string(hint, charGenerator, lengthGenerator) {
  return () => {
    const result = []
    const length = lengthGenerator()
    for (let i = 0; i < length; i++) {
      result.push(charGenerator())
    }
    return result.join('')
  }
}

const hint = {minLength: 0, maxLength: 40, minCodePoint: 0x20, maxCodePoint: 0x7e}
const hogeParamGenerator = (seed) => {
  const rand = genRand(hint, seed)

  const lengthGenerator = cogen_length(hint, rand)
  const charGenerator = cogen_char(hint, rand)
  const stringGenerator = cogen_string(hint, charGenerator, lengthGenerator)
  return stringGenerator()
}

for (let seed = 0; seed < 100; seed++) {
  // console.log(hogeParamGenerator(seed))
}

const stringPattern = {
  number: [{start: 0x30, end:0x39}],
  smallAlphabet: [{start: 0x61, end: 0x7a}],
  lergeAlphabet: [{start: 0x41, end: 0x5a}],
  alphabet: [{pattern: 'smallAlphabet'}, {pattern: 'lergeAlphabet'}],
  camelCase: [{freq: 4, pattern: 'smallAlphabet'}, {pattern: 'lergeAlphabet'}],
  snakeCase: [{freq: 4, pattern: 'smallAlphabet'}, {string: '_'}],
  // ctrlCode: [{start: 0x00, end: 0x1f, enum: [0x7f]}],
  space: [{enum: [0x09, 0x0a, 0x0d, 0x20]}],
  symbol: [{start: 0x21, end: 0x2f}, {start: 0x3a, end: 0x40}, {start: 0x5b, end: 0x60}, {start: 0x7b, end: 0x7e}],
  printableAscii: [{start: 0x20, end: 0x7e, enum: [0x09, 0x0a, 0x0d]}],
}

const tableCache = {}

const createTable = (name) => {
  if (name in tableCache) {
    return tableCache[name]
  }

  const patterns = stringPattern[name]
  const table = []
  
  const pushLiteral = (freq, s) => {
    for (let i = 0; i < freq; i++) {
      table.push(s)
    }
  }
  const pushCodePoint = (freq, codePoint) => pushLiteral(freq, String.fromCodePoint(codePoint))

  const pushValue = (freq, value) => {
    switch (typeof value) {
      case 'string': return pushLiteral(freq, value)
      case 'number': return pushCodePoint(freq, value)
      default: throw new Error(`unknown type ${typeof value} ${value}`)
    }
  }
  const pushArray = (freq, arr) => pushLiteral(freq, arr)
  
  patterns.forEach(pattern => {
    const freq = pattern.freq || 1
    if ('string' in pattern) {
      pushLiteral(freq, pattern.string)
    }
    if ('start' in pattern) {
      assert('end' in pattern)
      for (let codePoint = pattern.start; codePoint <= pattern.end; codePoint++) {
        pushCodePoint(freq, codePoint)
      }
    }
    if ('enum' in pattern) {
      assert(Array.isArray(pattern.enum))
      pattern.enum.forEach(value => {
        pushValue(freq, value)
      })
    }
    if ('pattern' in pattern) {
      pushLiteral(freq, createTable(pattern.pattern))
    }
  })

  tableCache[name] = table
  return table
}

const rand = genRand({})

const createChar = (table) => {
  const n = rand.rangeInt(0, table.length)
  const v = table[n]
  if (Array.isArray(table[n])) {
    return createChar(table[n])
  } else {
    assert(typeof table[n] === 'string')
    return table[n]
  }
}

const createString = (table) => {
  const arr = []
  for (let i = 0; i < 100; i++) {
    arr.push(createChar(table))
  }

  return arr.join('')
}

Object.keys(stringPattern).forEach(key => {
  const table = createTable(key)
  const s = createString(table)
  console.log(key, s)
})

// console.log(tableCache)
