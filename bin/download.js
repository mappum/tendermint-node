#!/usr/bin/env node

let { createWriteStream } = require('fs')
let { join } = require('path')
let { get } = require('axios')
let ProgressBar = require('progress')
let unzip = require('unzip').Parse

const TENDERMINT_VERSION = '0.19.2'

let url = getBinaryReleaseURL()

get(url, { responseType: 'stream' }).then((res) => {
  if (res.status !== 200) {
    throw Error(`Request failed, status: ${res.status}`)
  }
  let length = +res.headers['content-length']

  console.log(`downloading Tendermint v${TENDERMINT_VERSION}`)
  let template = '[:bar] :rate/Mbps :percent :etas'
  let bar = new ProgressBar(template, {
    complete: '=',
    incomplete: ' ',
    width: 20,
    total: length / 1e6 * 8
  })

  // unzip and write to file
  let path = join(__dirname, 'tendermint')
  let file = createWriteStream(path, { mode: 0o755 })
  res.data.pipe(unzip())
    .once('entry', (entry) => entry.pipe(file))

  // increment progress bar
  res.data.on('data', (chunk) => bar.tick(chunk.length / 1e6 * 8))
})

function getBinaryReleaseURL (version = TENDERMINT_VERSION) {
  let platforms = {
    'darwin': 'darwin',
    'linux': 'linux',
    'win32': 'windows',
    'freebsd': 'freebsd'
  }
  let arches = {
    'x32': '386',
    'x64': 'amd64',
    'arm': 'arm',
    'arm64': 'arm'
  }
  let platform = platforms[process.platform]
  let arch = arches[process.arch]
  return `https://github.com/tendermint/tendermint/releases/download/v${version}/tendermint_${version}_${platform}_${arch}.zip`
}
