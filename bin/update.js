#!/usr/bin/env node

let { spawn } = require('child_process')
let { writeFileSync } = require('fs')
let { join } = require('path')
let { get } = require('axios')

async function main ({ argv }) {
  let version = argv[2]
  if (!version) {
    console.error('Must specify tendermint version')
    return 1
  }

  let shasumsPath = join(__dirname, 'SHA256SUMS')
  let shasumsUrl = `https://github.com/tendermint/tendermint/releases/download/v${version}/SHA256SUMS`
  try {
    let res = await get(shasumsUrl)
    writeFileSync(shasumsPath, res.data)
  } catch (err) {
    console.error(`Request failed with status ${err.response.status}`)
    return 1
  }
  console.log('✅ updated SHA256SUMS file')

  let versionPath = join(__dirname, 'version')
  writeFileSync(versionPath, version)
  console.log('✅ updated version file')

  // run install script to download updated binary
  await new Promise((resolve, reject) => {
    let opts = {
      stdio: 'inherit'
    }
    let install = spawn('npm', ['run', 'install'], opts)
    install.once('close', (code) => {
      code === 0 ? resolve() : reject()
    })
  })
}

main(process)
  .then((code = 0) => process.exit(code))
