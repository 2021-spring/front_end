<script>
import InboundUpc from './InboundUpc'

export default {
  name: 'InboundSku',
  extends: InboundUpc,
  data () {
    return {
      mode: 'sku'
    }
  },
  computed: {
    skuToUpcMap () {
      return this.$store.getters.skuToUpcMap
    },
    // tempSkus () {
    //   return this.$store.getters.tempSkus
    // },
    // tempSkuMap () {
    //   return this.$store.getters.tempSkuMap
    // },
    label () {
      if (this.isTrackingMode) return 'Tracking number'
      return 'SKU'
    },
    scanText () {
      if (this.isTrackingMode) return 'Scan a tracking number'
      return 'Scan a SKU number'
    },
    isUploadBtnDisabled () {
      return this.importing || this.isDisabled || this.isTypeMixed
    }
  },    
  methods: {
    addBarcode (event) {
      if (!this.importing && this.inputLock) {
        event && event.target.select()
        return
      }

      if (!this.importing) {
        this.inputLock = true
        setTimeout(() => { this.inputLock = false }, 100)
      }

      if (this.handleSpecialBarcode()) return

      // detect org id first
      let orgId = this.detectOrgId(this.barcode.trim())
      if (orgId) {
        this.pickOrgId(orgId)
      } else {
        this.barcode = this.barcode.trim()
        let carrierMaybe = this.guessCarrier(this.barcode)
        if (carrierMaybe.length > 0) {
          this.addTracking(carrierMaybe)
        } else {
          this.addSku(event)
        }    
      }
      // this.playSound('success')
    },
    addSku (event) {
      if (this.isTrackingMode) {
        if (this.cache.trackings.length > 0) {
          this.addToStage(this.cache.trackings.slice(0), `${this.organizationKey}_${this.barcode}`, {quantity: 1})
        } else {
          this.showToast('Please scan a valid tracking number first', 'error', event)
        }
      } else if (this.organizationKey) {
        const cacheKey = `${this.organizationKey}_${this.barcode}`
        if (this.getSizeFromSku(cacheKey) === null) {
          return this.showToast('Invalid sku.', 'error', event)
        }
        let {quantity} = this.productCache[cacheKey] ? this.productCache[cacheKey] : {quantity: 0}
        quantity++
        this.productCache[cacheKey] = {quantity}
        this.barcode = ''
      } else {
        this.showToast('Please select organization first', 'error', event)
      }
      this.playSound('upc')
    },
    addToStage (trackings, barcode, extra) {
      if (!this.organizationKey) {
        return this.showToast('Please select organization.', 'error', event)
      }
      const size = this.getSizeFromSku(barcode)
      if (size !== 0 && !size) {
        return this.showToast('Invalid sku.', 'error', event)
      }
      if (trackings.length > 0) {
        const newItem = {
          trackings: trackings,
          quantity: extra && extra.quantity ? extra.quantity : 1,
          organizationKey: this.organizationKey,
          flag: extra && extra.flag ? extra.flag : false,
          upc: this.skuToUpcMap[barcode] || '',
          sku: barcode.split('_')[1],
          size,
          keywordString: trackings.map(item => item.barcode.join('')).join(',')
        }
        this.addToItems(newItem)
        this.barcode = ''
      }
    },
    findItemIndex (newItem) {
      let index = this.items.findIndex((element) => {
        return this.compareTrackings(element.trackings, newItem.trackings) && 
          element.sku === newItem.sku && 
          element.organizationKey === newItem.organizationKey && 
          !element.isUploaded
      })
      return index
    },
    showAddSizeDialog (item) {
      this.queryLimit = undefined
      this.packageInEdit = item
      this.addSkuDialog = true
    },
    getProductIdWithFlag (item) {
      return item.upc + (item.flag ? '*' : '')
    },
    displayProductCacheKeyWithFlag (key) {
      const sku = key.split('_')[1]
      return sku + (this.productCache[key] && this.productCache[key].flag ? '*' : '')
    }
  },
  props: {
    
  }
}
</script>
