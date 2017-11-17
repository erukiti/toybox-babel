const MesenneTwitter = require('mersenne-twister')
const assert = require('assert')
const RandExp = require('randexp')

function genRand(hint, seed) {
  const mt = new MesenneTwitter(seed)
  return {
    rangeInt: (min, max) => {
      return Math.floor(mt.random_incl() * (max - min)) + min
    }
  }
}

const stringPatterns = {
  empty: '',
  smallAlphabet: '[a-z]+',
  lergeAlphabet: '[A-Z]+',
  number: '[0-9]+',
  alphabet: '[a-zA-Z]+',
  alnum: '[0-9a-zA-Z]+',
  camelCase: '[a-z]+([A-Z][a-z]+)+',
  snakeCase: '[a-z]+(_[a-z]+)+',
  symbol: '[\x20-\x2f\x3a-\x40\x5b-\x60\x7b-\x7e]+',
  space: '[ \t\r\n]+',
  printableAscii: '[\x20-\x7e\r\t\n]+',
  unicode: '[\u0000-\uffff]+',
  emoji: '[\u10000-\u1ffff]+',
}

function cogen_string(hint, rand) {
  const maxLength = hint.maxLength || 1000 * 10
  const patterns = stringPatterns

  const generate = (pattern, max) => {
    const randexp = new RandExp(pattern)
    randexp.randInt = rand.rangeInt.bind(rand)
    randexp.max = max
    const s = randexp.gen()

    if ('validate' in hint) {
      hint.validate(s)
    }

    return s
  }

  const generateSmallAlphabet = (max) => {
    const arr = []
    for (i = 0; i < max; i++) {
      arr.push(String.fromCharCode(rand.rangeInt(0x61, 0x7a)))
    }
    return arr.join('')
  }

  let keys = Object.keys(patterns)
  assert(keys.length > 0)

  function *generator() {
    if ('empty' in patterns) {
      yield ''

      keys = keys.filter(key => key !== 'empty')
      if (keys.length === 0) {
        return
      }
    }

    let index = 0

    let max = 1
    let times = 5

    for (;;) {
      yield generate(patterns[keys[index]], max)
      index++

      if (index >= keys.length) {
        index = 0
        if ('smallAlphabet' in patterns) {
          yield generateSmallAlphabet(maxLength)
        }

        let arr = []
        for (i = 0; i < times; i++) {
          arr.push(generate(patterns[keys[rand.rangeInt(0, keys.length - 1)]], max))
        }
        yield arr.join('')
        
        max += 5
        if (max >= 20) {
          max = 5
        }
      }
    }
  }

  return generator()
}

const hint = {minLength: 0, maxLength: 40}
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

const rand = genRand({}, 1)
const generator = cogen_string({}, rand)
let count = 0
for (let s of generator) {
  console.log(s)
  count++
  if (count > 200) {
    break
  }  
}
