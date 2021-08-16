'use strict'
const configKey = require('./config-key.properties')


let firebaseConfig, emailCodeSettings, AESHTSUri

switch(process.env.NODE_ENV) {
  case 'core':
    firebaseConfig = configKey.core
    emailCodeSettings = {
      url: 'https://easygo-core.viteusa.com/signupContinue',
      handleCodeInApp: true
    }
    AESHTSUri = 'gs://easygo-core.appspot.com/AESHTS_2021-07-26.xlsx - Sheet1.csv.zip'
    break
  case 'production':
    firebaseConfig = configKey.production
    emailCodeSettings = {
      url: 'https://app.viteusa.com/signupContinue',
      handleCodeInApp: true
    }
    AESHTSUri = 'gs://viteusa-prod.appspot.com/AESHTS_2021-07-26.xlsx - Sheet1.csv.zip'
    break
  default:
    firebaseConfig = configKey.development
    emailCodeSettings = {
      url: 'http://localhost:8080/signupContinue',
      handleCodeInApp: true
    }
    AESHTSUri = 'gs://easywarehouse-1610a.appspot.com/AESHTS_2021-07-26.xlsx - Sheet1.csv.zip'
    break
} 

console.log('----- building for environment: ', process.env.NODE_ENV, " -----------")
console.log('to switch build environment, use "-- <environment>" argument \n\n ')
console.log('firebase: ', firebaseConfig)
console.log('version: ', require('../package.json').version, '\n\n')
module.exports = {
  firebaseConfig: JSON.stringify(firebaseConfig),
  emailCodeSettings: JSON.stringify(emailCodeSettings),
  NODE_ENV: JSON.stringify(process.env.NODE_ENV),
  version: JSON.stringify(require('../package.json').version),
  AESHTSUri: JSON.stringify(AESHTSUri)
}
