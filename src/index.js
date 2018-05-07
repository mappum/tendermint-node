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

  // TODO: attach Promises for useful events
  //       (e.g. when node is synced)
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

  // TODO: attach Promises for useful events
  //       (e.g. when node is synced)
  return child
}

function getRpcPort (opts, defaultPort = 46657) {
  if (!opts || ((!opts.rpc || !opts.rpc.laddr) && !opts.laddr)) {
    return defaultPort
  }
  let parsed = url.parse(opts.laddr || opts.rpc.laddr)
  return parsed.port
}

module.exports = {
  node,
  lite,
  init: (home) => run('init', { home }),
  initSync: (home) => run('init', { home }, true),
  version: () => run('version', true).stdout,
  genValidator: () => run('gen_validator', true).stdout
}
