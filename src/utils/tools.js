import utf8 from 'utf8'
import base64 from 'base-64'
import Decimal from 'decimal.js'
import cloneDeep from 'lodash/cloneDeep'
import {format, startOfDay, endOfDay} from 'date-fns'
import {imageResize, saveBarcodeImage} from './ImageProcessor'
import guessCarrier from './guessCarrier'

const Logger = {
  store: null,
  initialize: (vueStore) => {
    Logger.store = vueStore
  },
  log: (action, payload) => {
    let newPayload = payload
    Logger.store.dispatch('logEvent', [action, newPayload])
  },
  critical: (action, payload) => {
    let newPayload = payload
    Logger.store.dispatch('logCriticalEvent', [action, newPayload])
  },
  changeLog: (payload) => {
    Logger.store.dispatch('addChangeLog', payload)
  }
}

class ApiError extends Error {
  constructor (errCode, httpCode, message) {
    super(typeof message === 'object' ? JSON.stringify(message) : message)
    this.errCode = errCode || 'general'
    this.httpCode = httpCode || 500
    if (typeof message === 'object') {
      this.msgObj = message
    }
  }
}

function axiosWrapper (promise) {
  return promise
    .catch((error) => {
      if (error.response) {
        console.log(error.response)
        let {status, data} = error.response
        throw new ApiError(data.error.code, status, data.error.message)
      } else if (error.request) {
        console.log(error.request)
        throw error
      } else {
        console.log('Error', error.message)
        throw error
      }
    })
}

function capitalize (str) {
  return str ? str.slice(0, 1).toUpperCase() + str.slice(1) : ''
}

function sleep (period) {
  return new Promise(resolve => { setTimeout(resolve, period) })
}

const checkRules = {
  methods: {
    fieldIsRequired (fieldName) {
      return v => {
        if (Array.isArray(v)) {
          return v.length > 0 || `${capitalize(fieldName) || 'This field'} is required.`
        }
        if (v !== undefined && v !== null && typeof v === 'string') v = v.trim()
        return (!!v && JSON.stringify(v) !== '{}') || v === 0 || `${capitalize(fieldName) || 'This field'} is required.`
      }
    },
    fieldIsInteger (fieldName) {
      return v => v % 1 === 0 || v === null || `${capitalize(fieldName) || 'This field'} must be an integer.`
    },
    fieldIsNumber (fieldName) {
      return v => v >= 0 || v < 0 || `${capitalize(fieldName) || 'This field'} must be a number.`
    },
    fieldIsOverZero (fieldName) {
      return v => v > 0 || v === null || `${capitalize(fieldName) || 'This field'} must be over 0.`
    },
    fieldIsNoLessThanZero (fieldName) {
      return v => v >= 0 || v === null || `${capitalize(fieldName) || 'This field'} must be over or equal to 0.`
    },
    fieldIsZip () {
      return v => !v ||
        /^\d{5}$/.test(v) || 
        (/^\d{5}$/.test(v.split('-')[0]) && 
          (/^\d{4}$/.test(v.split('-')[1]) || 
            /^\d{5}$/.test(v.split('-')[1]))) ? true : "Zip code must be 'xxxxx' or 'xxxxx-xxxx(x)'"
    },
    fieldIsPhone () {
      return v => /^\d{10}$/.test(v) ? true : 'Phone number must be 10 digit'
    },
    fieldIsEmail () {
      return v => /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(v) || 'E-mail must be valid'
    },
    fieldCharLimit (fieldName, size = 0) {
      return v => !v || v.length <= size || `${capitalize(fieldName) || 'This field'} is limited to ${size} chars`
    },
    fieldIsPkgWeight (isOz) {
      return (v) => isOz ? (v >= 1 || 'Weight must be over or equal to 1 oz.') : (v >= 0.0625 || 'Weight must be over or equal to 1 oz.')
    }
  }
}

const warehouseTools = {
  methods: {
    guessCarrier
  }
}

function runRules (rules, val) {
  if (Array.isArray(rules)) {
    return !rules.some(func => { return func(val) !== true })
  } else if (typeof rules === 'function') {
    return rules(val) === true
  } else {
    return false
  }
}

const decimalTools = {
  methods: {
    toMoney (item, digits = 2) {
      return new Decimal(item).toDP(digits).toNumber()
    }
  }
}

const measurementTools = {
  methods: {
    cm_inch (cm) {
      return new Decimal(cm / 2.54).toDP(2).toNumber()
    },
    inch_cm (inch) {
      return new Decimal(inch * 2.54).toDP(2).toNumber()
    },
    kg_lbs (kg) {
      return new Decimal(kg * 2.205).toDP(2).toNumber()
    },
    lbs_kg (lbs) {
      return new Decimal(lbs / 2.205).toDP(2).toNumber()
    },
    convertPackagingSize ({height, length, width}, isMeasurementMetric, isRound = false) {
      if (!!isMeasurementMetric === !!this.$store.getters.isMeasurementMetric) {
        return {height, length, width}
      }
      const convertFunc = this[`${isMeasurementMetric ? 'cm' : 'inch'}_${this.$store.getters.isMeasurementMetric ? 'cm' : 'inch'}`]
      return {
        height: isRound ? Math.round(convertFunc(height)) : convertFunc(height), 
        length: isRound ? Math.round(convertFunc(length)) : convertFunc(length), 
        width: isRound ? Math.round(convertFunc(width)) : convertFunc(width)
      }
    },
    convertWeight (weight, isMeasurementMetric) {
      if (!!isMeasurementMetric === !!this.$store.getters.isMeasurementMetric) {
        return weight
      }
      const convertFunc = this[`${isMeasurementMetric ? 'kg' : 'lbs'}_${this.$store.getters.isMeasurementMetric ? 'kg' : 'lbs'}`]
      return convertFunc(weight)
    }
  }
}

const stringTools = {
  methods: {
    capitalize (s) {
      if (typeof s !== 'string') return ''
      return s.charAt(0).toUpperCase() + s.slice(1)
    },
    trimNonwordChar (barcode) {
      return barcode.replace(/[^\w-]/g, '')
    }
  }
}

function copyToClipboard (text) {
  var textArea = document.createElement('textarea')
  textArea.style.position = 'fixed'
  textArea.style.top = 0
  textArea.style.left = 0
  textArea.style.width = '2em'
  textArea.style.height = '2em'
  textArea.style.padding = 0
  textArea.style.border = 'none'
  textArea.style.outline = 'none'
  textArea.style.boxShadow = 'none'
  textArea.style.background = 'transparent'
  textArea.value = text
  document.body.appendChild(textArea)
  textArea.select()
  try {
    var successful = document.execCommand('copy')
    var msg = successful ? 'successful' : 'unsuccessful'
    console.log('Copying text command was ' + msg)
  } catch (err) {
    console.log('Oops, unable to copy')
  }
  document.body.removeChild(textArea)
}
function getApprovalTypeString (approvalType) {
  let status = ''
  switch (approvalType) {
    case 3:
      status = 'accepted'
      break
    case 2:
      status = 'limited'
      break
    case 1:
      status = 'blocked'
      break
    case 0:
      status = 'rejected'
      break
    default:
      break
  }
  return status
}

function getIsoTime () {
  return new Date().toISOString()
}

function getTime () {
  return new Date().getTime()
}

function getRandomIdByTime (withDigits = 0) {
  const timeString = Math.floor(getTime()).toString()
  let lastString = ''
  for (let i = 0; i < withDigits; i++) {
    lastString += Math.floor(Math.random() * 10).toString()
  }
  return timeString + lastString
}

function uniqueIdGenerator (qty) {
  // add 3 different digit based on current timestamp
  const curTime = Date.now()
  return new Array(qty).fill(1).map((item, index) => {
    let addOn = ''
    if (index < 10) {
      addOn = '00'
    } else if (index < 100) {
      addOn = '0'
    }
    return `${curTime}${addOn}${index}`
  })
}

/** get a random OrgId default 3 digits */
function getRandOrgId (digits = 3) {
  const letterPool = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  let output = ''
  for (let i = 0; i < digits; i++) {
    let index = Math.floor(Math.random() * Math.floor(letterPool.length))
    output += letterPool[index]
  }
  return output
}

const timezoneString = `${new Date().getTimezoneOffset() >= 0 ? '-' : '+'}${String(Math.abs(new Date().getTimezoneOffset() / 60)).padStart(2, '0')}:00`

function convertStringToDate (val) {
  return val && !(val instanceof Date) ? new Date(val + 'T00:00:00.000' + timezoneString) : val
}

function toTimestampString (date) {
  let rtn = convertStringToDate(date)
  return rtn && format(rtn, 'MM/dd/yyyy HH:mm')
}

function toDateString (date) {
  if (!(date instanceof Date) && (date instanceof Object) && date._methodName === 'FieldValue.serverTimestamp') return 'server time'
  let rtn = convertStringToDate(date)
  return rtn && format(rtn, 'MM/dd/yyyy')
}

function toPickerDateString (date) {
  let rtn = convertStringToDate(date)
  return rtn && format(rtn, 'yyyy-MM-dd')
}

function toDateStart (text) {
  let rtn = convertStringToDate(text)
  return rtn && startOfDay(rtn)
}

function toDateEnd (text) {
  let rtn = convertStringToDate(text)
  return rtn && endOfDay(rtn)
}

function toLocalDateString (date) {
  date = toDateEnd(date)
  let tzoffset = date.getTimezoneOffset() * 60000 // offset in milliseconds
  let localISOTime = (new Date(date - tzoffset)).toISOString().slice(0, 19).replace('T', ' ')
  return localISOTime
}

function isDateEqual (date1, date2) {
  return new Date(date1).valueOf() === new Date(date2).valueOf()
}

// function dateToISOStringDeep (obj) {
//   if (!obj) return obj

//   Object.entries(obj).forEach(([key, val]) => {
//     if (!val) {
//       obj[key] = val
//     } else if (val.toISOString) {
//       obj[key] = {value: val.toISOString(), isISOStrng: true}
//     } else if (typeof val === 'object') {
//       dateToISOStringDeep(val)
//     }
//   })
//   return obj
// }

// function reverseISOStringBackDeep (obj) {
//   if (!obj) return obj

//   Object.entries(obj).forEach(([key, val]) => {
//     if (!val) {
//       obj[key] = val
//     } else if (val.isISOStrng) {
//       obj[key] = new Date(val.value)
//     } else if (typeof val === 'object') {
//       reverseISOStringBackDeep(val)
//     }
//   })
//   return obj
// }

const timeTools = {
  methods: {
    toTimestampString,
    toDateString,
    toPickerDateString,
    toDateStart,
    toDateEnd,
    toLocalDateString,
    isDateEqual,
    getIsoTime () {
      return new Date().toISOString()
    },
    getTime () {
      return new Date().getTime()
    },
    toDateMMDDHHmm (date) {
      return date && format(date, 'MM/dd HH:mm')
    },
    toDateYYYYMMDD (date) {
      return date && format(date, 'yyyy-MM-dd')
    },
    toDateYYYYMMDDHHmm (date) {
      return date && format(date, 'yyyy-MM-dd HH:mm')
    },
    formatDate (date) {
      if (!date) return null
      const [year, month, day] = date.split('-')
      return `${month}/${day}/${year}`
    }
  }
}

function getCurDateKeyStr () {
  const currentTime = new Date()
  const curMonthKeyStr = `${currentTime.getFullYear()}-${(currentTime.getMonth() + 1).toString().padStart(2, '0')}`
  return `${curMonthKeyStr}-${currentTime.getDate().toString().padStart(2, '0')}`
}

function splitTrackingNum (text) {
  text = text.replace(/\n/g, ' ')
  text = text.replace(/,/g, ' ')
  text = text.replace(/\./g, ' ')
  text = text.replace(/;/g, ' ')
  text = text.replace(/；/g, ' ')
  text = text.replace(/，/g, ' ')
  text = text.replace(/。/g, ' ')
  text = text.replace(/"/g, ' ')
  text = text.replace(/'/g, ' ')
  text = text.replace(/“/g, ' ')
  text = text.replace(/”/g, ' ')
  text = text.replace(/‘/g, ' ')
  text = text.replace(/’/g, ' ')
  text = text.replace(/\s+/g, ' ')
  text = text.trim()

  let arr = text.split(' ')
  return arr.filter(item => item !== '').map(tracking => tracking.toUpperCase())
}

function splitKeyword (text) {
  text = text.replace(/\n/g, ' ')
  text = text.replace(/,/g, ' ')
  text = text.replace(/\./g, ' ')
  text = text.replace(/，/g, ' ')
  text = text.replace(/。/g, ' ')
  text = text.replace(/\s+/g, ' ')
  text = text.trim()

  let rtn = text.toLowerCase().split(' ').filter(item => item !== '' && item !== '-' && typeof item === 'string')
  return [...new Set(rtn)]
}

function base64Encoding (text) {
  return base64.encode(utf8.encode(text))
}

// true for equal, false for not equal
function compareArrayInOrder (a, b) {
  return a.every((item, index) => {
    let bItem = b[index]
    return bItem && Object.keys(item).every(key => {
      let rtnValue = false
      if (item[key] instanceof Date) {
        rtnValue = (item[key].getTime() === bItem[key].getTime())
      } else if (typeof item[key] === 'string') {
        rtnValue = (item[key] === bItem[key])
      } else {
        // may need to enhance deep compare of other type in the future
        rtnValue = true
      }
      return rtnValue
    })
  })
}

// return true if two objects have same fields
function deepEqual (a, b) {
  if ((!a && b) || (a && !b)) return false
  if ((!a || (Array.isArray(a) && !a.length)) && (!b || (Array.isArray(b) && !b.length))) return true

  let aKeys = Object.keys(a)
  let bKeys = Object.keys(b)

  if (aKeys.length !== bKeys.length) return false

  return !aKeys.some(aKey => {
    if (typeof a[aKey] === 'object') {
      return a[aKey] && b[aKey] ? !deepEqual(a[aKey], b[aKey]) : true
    } else {
      return a[aKey] !== b[aKey]
    }
  })
}

function getNullFields (payload) {
  let undefinedFields = []
  Object.keys(payload).forEach(key => {
    if (typeof payload[key] === 'object' && payload[key].constructor.name !== 'Date' && payload[key].constructor.name !== 't') {
      let childHasUndefined = getNullFields(payload[key])
      childHasUndefined.length > 0 && (undefinedFields = [...undefinedFields, ...childHasUndefined])
    } else if (payload[key] == null || typeof payload[key] === 'undefined') {
      undefinedFields.push(key)
    }
  })

  return undefinedFields
}

// Deep transfer timestamps in an object into date type
function convertTimestampToDateInObj (obj) {
  if (!obj) return obj
  for (var a in obj) {
    if (typeof (obj[a]) === 'object' && obj[a] !== null) {
      if (typeof obj[a].toDate === 'function') {
        obj[a] = obj[a].toDate()
      } else {
        convertTimestampToDateInObj(obj[a])
      }
    }
  }
  return obj
}

// get the difference in value from a comparing to b. If c is provided, the data will put into the return object in the end
// note: it is shallow, so may not work with field of Object type
function getDifferenceShallow (a, b, c) {
  let rtn = {}
  Object.keys(a).forEach(key => {
    if (a[key] !== b[key]) rtn[key] = a[key]
  })

  c && (rtn = {...rtn, ...c})

  return rtn
}

// add number with decimal
function addNumbers (...items) {
  return items.reduce((sum, item) => {
    return sum.plus(item)
  }, new Decimal(0)).toDP(2).toNumber()
}

function toMoney (item) {
  return new Decimal(item).toDP(2).toNumber()
}

function splitProductName (text = '') {
  let originText = text.toLowerCase()

  text = text.replace(/\n/g, ' ')
  text = text.replace(/,/g, ' ')
  text = text.replace(/\./g, ' ')
  text = text.replace(/，/g, ' ')
  text = text.replace(/。/g, ' ')
  text = text.replace(/\s+/g, ' ')
  text = text.trim()

  let arr = text.toLowerCase().split(' ').filter(item => item !== '' && item !== '-')
  let arr2 = []
  for (let i = 0; i < arr.length - 1; i++) {
    arr2.push(`${arr[i]} ${arr[i + 1]}`)
  }
  arr = [...arr, ...arr2, originText]
  return arr
}

function sortNoCase (fieldName) {
  if (fieldName) {
    return (a, b) => {
      if (a[fieldName].toString().toUpperCase() > b[fieldName].toString().toUpperCase()) {
        return 1
      } else if (a[fieldName].toString().toUpperCase() === b[fieldName].toString().toUpperCase()) {
        return 0
      } else {
        return -1
      }
    } 
  } else {
    return (a, b) => {
      if (a.toString().toUpperCase() > b.toString().toUpperCase()) {
        return 1
      } else if (a.toString().toUpperCase() === b.toString().toUpperCase()) {
        return 0
      } else {
        return -1
      }
    } 
  }
}

function formatPhoneNumber (phoneNumber) {
  if (!phoneNumber) return ''
  let phoneNumberString = phoneNumber.trim()
  var cleaned = ('' + phoneNumberString).replace(/\D/g, '')
  var match = cleaned.match(/^(.*|)?(\d{3})(\d{3})(\d{4})$/)
  if (match) {
    var intlCode = (match[1] ? `+${match[1]}` : '')
    return [intlCode, ' (', match[2], ') ', match[3], '-', match[4]].join('')
  }
  return phoneNumberString
}

const mediaTools = {
  data () {
    return {
      audioCtx: null
    }
  },
  methods: {
    makeBeepSoundFunc (frequency = 500, volume = 1, duration = 250, soundType = 'square') {
      this.audioCtx = this.audioCtx || new (window.AudioContext || window.webkitAudioContext)()
      if (!this.audioCtx) {
        console.warn('This browser does not support audio context')
        return false
      }
      return () => {
        let oscillator = this.audioCtx.createOscillator()
        let gainNode = this.audioCtx.createGain()
      
        oscillator.connect(gainNode)
        gainNode.connect(this.audioCtx.destination)
      
        gainNode.gain.value = volume
        oscillator.frequency.value = frequency
        oscillator.type = soundType
      
        oscillator.start()
        oscillator.stop(this.audioCtx.currentTime + duration / 1000)
      }
    },
    hintSound (scheme = 1) {
      let frequency = 900 + 400 * (scheme - 1)
      return this.makeBeepSoundFunc(frequency, 1, 200)
    },
    upcSound (scheme = 1) {
      let frequency = 2000 + 400 * (scheme - 1)
      return this.makeBeepSoundFunc(frequency, 1, 200)
    },
    trackingSound (scheme = 1) {
      let frequency = 300 + 400 * (scheme - 1)
      return this.makeBeepSoundFunc(frequency, 1, 200)
    },
    successSound (scheme = 1) {
      let frequency = 1500 + 400 * (scheme - 1)
      return this.makeBeepSoundFunc(frequency, 1, 200)
    },
    warningSound (scheme = 1) {
      let frequency = 300 + 200 * (scheme - 1)
      let warning = this.makeBeepSoundFunc(frequency, 1, 200)
      return () => { 
        warning()
        setTimeout(warning, 350)
      }
    },
    closeSound () {
      if (this.audioCtx) {
        return this.audioCtx.close()
          .then(() => (this.audioCtx = null))
      }
    }
  }
}

function getDefaultEmailTemplates () {
  return {
    approved: {
      template: `
Dear #{orgName}:

Congratulations. Your warehouse signup request to #{warehouse} has been approved.

Here is your shipping information:
Organization ID: #{orgId}
Shipment address: #{sampleAddress}

If you have any questions, feel free to contact us through warehouse/support or QQ.

Best regards,

#{warehouse}`,
      attachments: []
    },
    rejected: {
      template: `
Dear #{orgName}:

We are sorry to inform you that your warehouse signup request has been rejected. 

If you have further questions, feel free to contact our sales representative.

Best regards,

#{warehouse}`
    }
  }
}

/**
 * 
 * @param {string} tracking user input tracking string
 * @returns {string} string remove invisible char 
 */
function normalizeInputString (tracking) {
  return tracking.replace(/[^\u0020-\u007E]/g, '').trim()
}

function isObject (data) {
  return typeof data !== 'object'
}

function gotoGoogleMap ({address1, address2, city, state, zipCode} = {}) {
  const locationString = `${address1}, ${address2 ? `${address2}, ` : ''}${city}, ${state}, ${zipCode}`.split(' ').join('+')
  window.open(`https://www.google.com/maps/place/${locationString}`, '_blank')
}

export {copyToClipboard, getIsoTime, getTime, toTimestampString, toDateString, isDateEqual,
  toPickerDateString, toDateEnd, toDateStart, getApprovalTypeString, splitTrackingNum, 
  base64Encoding, compareArrayInOrder, deepEqual, getNullFields, getDifferenceShallow,
  Logger, addNumbers, toMoney, convertTimestampToDateInObj, toLocalDateString, splitProductName, 
  sortNoCase, formatPhoneNumber, checkRules, runRules, timeTools, decimalTools, mediaTools, sleep,
  getRandomIdByTime, capitalize, getDefaultEmailTemplates, cloneDeep, getRandOrgId, imageResize, warehouseTools,
  saveBarcodeImage, axiosWrapper, splitKeyword, normalizeInputString, stringTools, uniqueIdGenerator, measurementTools,
  isObject, gotoGoogleMap, getCurDateKeyStr
}
