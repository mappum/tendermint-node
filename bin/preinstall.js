const { closeSync, openSync } = require('fs')
const { join } = require('path')

const tendermint_path = join(__dirname, "tendermint")

closeSync(openSync(tendermint_path, 'w'))