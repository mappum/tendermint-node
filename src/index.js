let url = require('url')
let debug = require('debug')('tendermint-node')
let exec = require('execa')
let { RpcClient } = require('tendermint')
let flags = require('./flags.js')

const binPath = require.resolve('../bin/tendermint')

async function run (command, opts) {
  let args = [ command, ...flags(opts) ]
  debug('tendermint ' + args.join(' '))
  let res = await exec(binPath, args)
  maybeError(res)
  return res
}

function runSync (command, opts) {
  let args = [ command, ...flags(opts) ]
  debug('tendermint ' + args.join(' '))
  let res = exec.sync(binPath, args)
  maybeError(res)
  return res
}

function maybeError ({ code }) {
  if (code !== 0) {
    throw Error(`tendermint exited with code ${code}`)
  }
}

function node (opts) {
  let child = run('node', opts)

  let rpcPort = getRpcPort(opts)
  child.rpc = RpcClient(`http://localhost:${rpcPort}`)

  // TODO: attach Promises for useful events
  //       (e.g. when node is synced)
  return child
}

function getRpcPort (opts) {
  if (!opts || !opts.rpc || !opts.rpc.laddr) {
    return 46657 // tendermint default
  }
  let parsed = url.parse(opts.rpc.laddr)
  return parsed.port
}

module.exports = {
  node,
  init: (opts) => run('init', opts),
  initSync: (opts) => runSync('init', opts),
  version: () => runSync('version').stdout,
  genValidator: () => runSync('gen_validator').stdout
}
