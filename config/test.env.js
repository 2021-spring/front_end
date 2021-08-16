'use strict'
const merge = require('webpack-merge')
const devEnv = require('./env')

module.exports = merge(devEnv, {
  NODE_ENV: '"testing"'
})
