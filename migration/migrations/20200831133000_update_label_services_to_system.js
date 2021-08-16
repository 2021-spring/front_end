
const currentTime = new Date()

const labelServices = [
  {
    carrier: 'FedEx',
    signatureOptions: [{
      text: 'No signature',
      value: 'NO_SIGNATURE_REQUIRED',
      default: true 
    }, {
      text: 'Indirect',
      value: 'INDIRECT'
    }, {
      text: 'Direct',
      value: 'DIRECT'
    }, {
      text: 'Adult',
      value: 'ADULT'
    }],
    serviceTypes: [
      { value: 'FEDEX_GROUND', text: 'FedEx ground/home', default: true },
      { value: 'FEDEX_EXPRESS_SAVER', text: 'FedEx express saver' },
      { value: 'FEDEX_2_DAY', text: 'FedEx 2 day' },
      { value: 'FEDEX_2_DAY_AM', text: 'FedEx 2 day am' },
      { value: 'STANDARD_OVERNIGHT', text: 'FedEx standard overnight' },
      { value: 'PRIORITY_OVERNIGHT', text: 'FedEx priority overnight' }
    ],
    enableMWT: true,
    enableInsured: true
  },
  {
    carrier: 'UPS',
    signatureOptions: [{
      text: 'No signature',
      value: 'NO_SIGNATURE_REQUIRED',
      default: true 
    // }, {
    //   text: 'Delivery confirmation',
    //   value: 'DELIVERY_CONFIRMATION',
    //   default: true 
    }, {
      text: 'Direct',
      value: 'SIGNATURE_REQUIRED'
    // }, {
    //   text: 'Adult signature required',
    //   value: 'ADULT_SIGNATURE_REQUIRED'
    }],
    serviceTypes: [
      // { value: 'UPS_GROUND', text: 'UPS ground', default: true },
      // { value: 'UPS_2ND_DAY_AIR', text: 'UPS 2nd day air' },
      // { value: 'UPS_2ND_DAY_AIR_AM', text: 'UPS 2nd day air A.M.' },
      // { value: 'UPS_3_DAY_SELECT', text: 'UPS 3 day select' },
      // { value: 'UPS_NEXT_DAY_AIR', text: 'UPS next day air' },
      // { value: 'UPS_NEXT_DAY_AIR_EARLY', text: 'UPS next day air early' },
      // { value: 'UPS_NEXT_DAY_AIR_SAVER', text: 'UPS next day air saver' }
      { value: 'UPS_GROUND - KSAGSP', text: 'UPS Ground - small pkg', default: true },
      { value: 'UPS_GROUND - KSAG', text: 'UPS Ground - large pkg' }
      // { value: 'UPS_GROUND - KSAWSP', text: 'UPS Ground - west small pkg' },
      // { value: 'UPS_GROUND - KSAW', text: 'UPS Ground - west large pkg' }
    ],
    enableMWT: true,
    enableInsured: false
  },
  {
    carrier: 'USPS',
    signatureOptions: [{
      text: 'No',
      value: false,
      default: true 
    }
    ],
    serviceTypes: [{
      text: 'USPS (First class/Priority)',
      value: 'USPS'
    }],
    enableMWT: false,
    enableInsured: false
  }
]

const internationalLabelServices = [
  {
    carrier: 'FedEx-international',
    signatureOptions: [ {
      text: 'No signature',
      value: 'NO_SIGNATURE_REQUIRED'
    }, {
      text: 'Indirect',
      value: 'INDIRECT',
      default: true 
    }, {
      text: 'Direct',
      value: 'DIRECT'
    }, {
      text: 'Adult',
      value: 'ADULT'
    }],
    serviceTypes: [
      { value: 'INTERNATIONAL_ECONOMY', text: 'FedEx International Economy', default: true },
      { value: 'INTERNATIONAL_PRIORITY', text: 'FedEx International Priority' }
    ],
    enableMWT: true,
    enableInsured: true
  },
  {
    carrier: 'FedEx-international',
    signatureOptions: [ {
      text: 'No signature',
      value: 'NO_SIGNATURE_REQUIRED'
    }, {
      text: 'Direct',
      value: 'DIRECT',
      default: true 
    }],
    serviceTypes: [
      { value: 'INTERNATIONAL_ECONOMY_FREIGHT', text: 'FedEx International Economy Freight', default: true },
      { value: 'INTERNATIONAL_PRIORITY_FREIGHT', text: 'FedEx International Priority Freight' }
    ],
    enableMWT: false,
    enableInsured: true
  }
]
/**
 * 
 * {
 *  carrier: string,
 *  signatureOptions: Array<boolean | string>
 *  serviceTypes: string[]
 *  enableInsured: boolean
 * }
 */

/**
 * 
 * @param {import('firebase-admin').firestore.Firestore} db 
 */
module.exports = async function updateLabelServices (db) {
  const systemRef = db.doc('sysAdmin/general')
  await systemRef.update({labelServices, internationalLabelServices})
  console.log(`Update sysAmin/general labelServices at ${currentTime}`)
  return 'all-set'
}
