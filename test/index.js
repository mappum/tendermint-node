let { exists } = require('fs-extra')
let { tmpdir } = require('os')
let { join } = require('path')
let test = require('ava')
let tm = require('..')

test('version', (t) => {
  let version = tm.version()
  // 0.0.0-ffffffff
  let format = /^[0-9]+\.[0-9]+\.[0-9]+-[0-9a-f]{8}$/
  t.true(format.test(version))
})

test('genValidator', (t) => {
  let validator = tm.genValidator()
  JSON.parse(validator)
  t.pass()
})

test('init', async (t) => {
  let dir = tempDir()
  await tm.init(dir)
  await ensureInitFiles(dir)
  t.pass()
})

test('init with no path', async (t) => {
  try {
    await tm.init()
  } catch (err) {
    t.pass()
  }
})

test('initSync', async (t) => {
  let dir = tempDir()
  tm.initSync(dir)
  await ensureInitFiles(dir)
  t.pass()
})

test('node with no path', async (t) => {
  try {
    tm.node()
  } catch (err) {
    t.pass()
  }
})

test('node', async (t) => {
  let dir = tempDir()
  await tm.init(dir)

  let node = tm.node(dir, { proxyApp: 'nilapp' })
  await node.started()
  await node.synced()

  await node.rpc.status()
  t.pass('rpc request passed')

  node.kill()
  await node // wait for process to end
  try {
    await node.rpc.status()
  } catch (err) {
    t.pass('rpc request failed')
  }
})

test('node with custom RPC port', async (t) => {
  let dir = tempDir()
  await tm.init(dir)

  let node = tm.node(dir, {
    proxyApp: 'nilapp',
    p2p: { laddr: 'tcp://localhost:56656' },
    rpc: { laddr: 'tcp://localhost:56657' }
  })
  await node.started()

  t.is(node.rpc.uri, 'http://localhost:56657/')
  await node.rpc.status()
  t.pass('rpc request passed')

  node.kill()
  await node // wait for process to end
})

test('lite', async (t) => {
  let nodeDir = tempDir()
  await tm.init(nodeDir)

  let node = tm.node(nodeDir, {
    proxyApp: 'nilapp',
    p2p: { laddr: 'tcp://localhost:36656' },
    rpc: { laddr: 'tcp://localhost:36657' }
  })
  await node.started()
  await node.synced()

  let liteDir = tempDir()
  let lite = tm.lite('tcp://localhost:36657', liteDir)
  await lite.started()
  await lite.synced()

  await lite.rpc.status()
  t.pass('rpc request passed')

  lite.kill()
  await lite // wait for process to end
  try {
    await lite.rpc.status()
  } catch (err) {
    t.pass('rpc request failed')
  }

  node.kill()
  await node
})

test('lite with custom port', async (t) => {
  let nodeDir = tempDir()
  await tm.init(nodeDir)

  let node = tm.node(nodeDir, {
    proxyApp: 'nilapp',
    p2p: { laddr: 'tcp://localhost:26656' },
    rpc: { laddr: 'tcp://localhost:26657' }
  })
  await node.started()
  await node.synced()

  let liteDir = tempDir()
  let lite = tm.lite('tcp://localhost:26657', liteDir, {
    laddr: 'tcp://localhost:7777'
  })
  await lite.started()
  await lite.synced()

  t.is(lite.rpc.uri, 'http://localhost:7777/')
  await lite.rpc.status()
  t.pass('rpc request passed')

  lite.kill()
  await lite

  node.kill()
  await node
})

test('lite with missing args', async (t) => {
  try {
    tm.lite()
  } catch (err) {
    t.is(err.message, '"target" argument is required')
  }

  try {
    tm.lite('foo')
  } catch (err) {
    t.is(err.message, '"path" argument is required')
  }
})

test('error when tendermint exit code is not 0', async (t) => {
  try {
    tm.initSync('/thispathdoesnotexist')
  } catch (err) {
    t.true(err.message.startsWith('Command failed'))
  }
})

function tempDir () {
  return join(tmpdir(), Math.random().toString(36))
}

async function ensureInitFiles (dir) {
  await exists(join(dir, 'config/config.toml'))
  await exists(join(dir, 'config/genesis.json'))
  await exists(join(dir, 'config/node_key.json'))
  await exists(join(dir, 'config/priv_validator.json'))
}
