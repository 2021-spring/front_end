/* how to manage this table */
const surchargesNameTable = [
  ["Residential", "fedExHomeDeliveryUrban/RuralChargeAmount", "residential"],
  ["Postage", "postageAmount", "PostageAmount"],
  ["Additional handling", "additionalHandling"],
  ["Additional handling surcharge - weight","additionalHandlingSurcharge-WeightAmount", "aHS-Weight"],
  ["Additional handling surcharge - Dimension","additionalHandlingSurcharge-DimensionAmount", "aHS-Dimensions"],
  ["Fuel surcharge", "fuelSurcharge", "fedExGroundFuelAmount"],
  ["Peak - additional handling surcharge", "peak-AdditionalHandlingSurchargeAmount", "peak-AHSCharge"],
  ["Delivery Area Surcharge: Commercial", "dASComm", "deliveryAreaSurchargeCommercialAmount"],
  ["Delivery Area Surcharge: Residential", "deliveryAreaSurchargeResidentialAmount", "DAS Resi.", "dASResi"],
  ["Delivery Area Surcharge: Extended Residential", "deliveryAreaSurchargeExtendedResidentialAmount", "DAS Extended Resi.", "dASExtendedResi"],
  ["Delivery Area Surcharge: Extended Commercial", "deliveryAreaSurchargeExtendedCommercialAmount", "DAS Extended Comm.", "dASExtendedComm"],
  ["Delivery Area Surcharge: Hawaii Residential", "DAS Hawaii Resi.", "dASHawaiiResi"],
  ["Peak - oversize charge", "peak-OversizeCharge","peak-OversizeChargeAmount"],
  ["Oversize charge", "oversizeCharge"],
  ["Address correction", "addressCorrection"],
  ["Balance fix", "balanceFix"],
  ["FedEx ground oversize III", "fedExGroundOversizeIIIAmount"],
  ["Direct signature required", "directSignature","directSignatureRequiredAmount"],
  ["Signature", "signatureAmount"],
  ["Insurance", "InsuranceAmount", "insuranceAmount"],
  ["Peak - season surcharge", "peakSeasonSurcharge"],
  ["Delivery area surcharge", "fedExGroundDeliveryAreaAmount"]
]
/**
 *
 * @param {string} alias
 * @returns {string}
 */
module.exports = function(alias) {
  const nameList = surchargesNameTable.find(nameArr => nameArr.includes(alias))

  const name = nameList ? nameList[0] : alias
  return name
}
