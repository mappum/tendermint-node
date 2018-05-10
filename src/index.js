let url = require('url')
let debug = require('debug')('tendermint-node')
let exec = require('execa')
let { RpcClient } = require('tendermint')
let flags = require('./flags.js')

const binPath = require.resolve('../bin/tendermint')

function run (command, opts, sync) {
  let args = [ command, ...flags(opts) ]
  debug('tendermint ' + args.join(' '))
  let res = (sync ? exec.sync : exec)(binPath, args)
  maybeError(res)
  return res
}

function maybeError (res) {
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
  let child = run('node', opts)

  let rpcPort = getRpcPort(opts)
  child.rpc = RpcClient(`http://localhost:${rpcPort}`)
  child.started = waitForRpc(child.rpc)
  child.synced = waitForSync(child.rpc)

  return child
}

function lite (target, path, opts = {}) {
  if (typeof target !== 'string') {
    throw Error('"target" argument is required')
  }
  if (typeof path !== 'string') {
    throw Error('"path" argument is required')
  }

  opts.home = path
  let child = run('lite', opts)

  let rpcPort = getRpcPort(opts, 8888)
  child.rpc = RpcClient(`http://localhost:${rpcPort}`)
  child.started = waitForRpc(child.rpc)
  child.synced = waitForSync(child.rpc)

  return child
}

function getRpcPort (opts, defaultPort = 46657) {
  if (!opts || ((!opts.rpc || !opts.rpc.laddr) && !opts.laddr)) {
    return defaultPort
  }
  let parsed = url.parse(opts.laddr || opts.rpc.laddr)
  return parsed.port
}

async function waitForRpc (client, timeout = 30 * 1000) {
  while (true) {
    try {
      await client.status()
      break
    } catch (err) {
      await wait(1000)
    }
  }
}

async function waitForSync (client, timeout = 30 * 1000) {
  while (true) {
    try {
      let status = await client.status()
      if (status.sync_info.syncing === false) {
        break
      }
    } catch (err) {
      await wait(1000)
    }
  }
}

function wait (ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

module.exports = {
  node,
  lite,
  init: (home) => run('init', { home }),
  initSync: (home) => run('init', { home }, true),
  version: () => run('version', {}, true).stdout,
  genValidator: () => run('gen_validator', {}, true).stdout
}
