let test = require('ava')
let flags = require('../src/flags.js')

test('simple flags', (t) => {
  let args = flags({
    foo: 5,
    bar: 'test',
    camelCase: 'someValue'
  })
  t.deepEqual(args, [
    '--foo', '5',
    '--bar', 'test',
    '--camel_case', 'someValue'
  ])
})

test('nested objects', (t) => {
  let args = flags({
    foo: { bar: 5 },
    camelCase: { camelCase: 5 }
  })
  t.deepEqual(args, [
    '--foo.bar', '5',
    '--camel_case.camel_case', '5'
  ])
})

test('no args', (t) => {
  let args = flags()
  t.deepEqual(args, [])
})
