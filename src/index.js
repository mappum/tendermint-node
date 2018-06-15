let url = require('url')
let debug = require('debug')('tendermint-node')
let _exec = require('execa')
let _spawn = require('cross-spawn')
let { RpcClient } = require('tendermint')
let flags = require('./flags.js')

const binPath = require.resolve('../bin/tendermint')

function exec (command, opts, sync) {
  let args = [ command, ...flags(opts) ]
  debug('executing: tendermint ' + args.join(' '))
  let res = (sync ? _exec.sync : _exec)(binPath, args)
  maybeError(res)
  return res
}

function spawn (command, opts) {
  let args = [ command, ...flags(opts) ]
  debug('spawning: tendermint ' + args.join(' '))
  let child = _spawn(binPath, args)
  setTimeout(() => {
    try {
      child.stdout.resume()
      child.stderr.resume()
    } catch (err) {}
  }, 4000)
  let promise = new Promise((resolve, reject) => {
    child.once('exit', resolve)
    child.once('error', reject)
  })
  child.then = promise.then.bind(promise)
  child.catch = promise.catch.bind(promise)
  return child
}

function maybeError (res) {
  if (res.killed) return
  if (res.then != null) {
    return res.then(maybeError)
  }
  if (res.code !== 0) {
    throw Error(`tendermint exited with code ${res.code}`)
  }
}

function node (path, opts = {}) {
  if (typeof path !== 'string') {
    throw Error('"path" argument is required')
  }

  opts.home = path
  let child = spawn('node', opts)
  let rpcPort = getRpcPort(opts)
  return setupChildProcess(child, rpcPort)
}

function lite (target, path, opts = {}) {
  if (typeof target !== 'string') {
    throw Error('"target" argument is required')
  }
  if (typeof path !== 'string') {
    throw Error('"path" argument is required')
  }

  opts.node = target
  opts.home = path
  let child = spawn('lite', opts)
  let rpcPort = getRpcPort(opts, 8888)
  return setupChildProcess(child, rpcPort)
}

function setupChildProcess (child, rpcPort) {
  let rpc = RpcClient(`http://localhost:${rpcPort}`)
  let started, synced

  return Object.assign(child, {
    rpc,
    started: () => {
      if (started) return started
      started = waitForRpc(rpc)
      return started
    },
    synced: () => {
      if (synced) return synced
      synced = waitForSync(rpc)
      return synced
    }
  })
}

function getRpcPort (opts, defaultPort = 46657) {
  if (!opts || ((!opts.rpc || !opts.rpc.laddr) && !opts.laddr)) {
    return defaultPort
  }
  let parsed = url.parse(opts.laddr || opts.rpc.laddr)
  return parsed.port
}

let waitForRpc = wait(async (client) => {
  await client.status()
  return true
})

let waitForSync = wait(async (client) => {
  let status = await client.status()
  return (
    status.sync_info.syncing === false &&
    status.sync_info.latest_block_height > 0
  )
})

function wait (condition) {
  return async function (client, timeout = 30 * 1000) {
    let start = Date.now()
    while (true) {
      let elapsed = Date.now() - start
      if (elapsed > timeout) {
        throw Error('Timed out while waiting')
      }

      try {
        if (await condition(client)) break
      } catch (err) {}

      await sleep(1000)
    }
  }
}

function sleep (ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

module.exports = {
  node,
  lite,
  init: (home) => exec('init', { home }),
  initSync: (home) => exec('init', { home }, true),
  version: () => exec('version', {}, true).stdout,
  genValidator: () => exec('gen_validator', {}, true).stdout
}
