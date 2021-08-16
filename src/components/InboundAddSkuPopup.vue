<script>
import InboundAddUpcPopup from './InboundAddUpcPopup'

export default {
  name: 'InboundAddSkuPopup',
  extends: InboundAddUpcPopup,
  data () {
    return {
      mode: 'sku',
      title: 'Add SKU',
      barcodeLabel: 'SKU',
      barcode: '',
      hasQueryFunction: false
    }
  },
  computed: {
    skuToUpcMap () {
      return this.$store.getters.skuToUpcMap
    },
    skuMap () {
      return this.$store.getters.tempSkuMap
    }
  },    
  methods: {
    initData () {
      const {sku: barcode, organizationKey} = this.package
      Object.assign(this, {barcode, organizationKey})
    },
    async onSubmitted () {
      const {barcode, description, size, unitFee, organizationKey} = this
      const skuKey = `${organizationKey}_${barcode}`
      if (this.skuMap[skuKey]) {
        if (!confirm('This sku has already been created, Do you want to override it?')) return
      }
      await this.$store.dispatch('updateTempSku', {sku: barcode, description, size, unitFee, organizationKey})
      this.$emit('submitted', {sku: barcode, size})
    }
  },
  props: {
    selectedWarehouseLimitedInfo: Object
  }
}
</script>
