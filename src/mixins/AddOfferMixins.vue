<script>

export default {
  data () {
    return {
      initProduct: {},
      initOffer: {},
      addOfferDialog: false
    }
  },
  computed: {
    warehouses () {
      return this.$store.getters.warehouses
    },
    warehouseSites () {
      return this.$store.getters.warehouses.reduce((sum, warehouse) => {
        return [...sum, ...warehouse.sites]
      }, [])
    },
    maxOfferQty () {
      if (this.$store.getters.tenant.maxOfferQty === 0) return 0
      return this.$store.getters.tenant.maxOfferQty || 1000
    },
    offers () {
      return this.$store.getters.offers
    }
  },
  methods: {
    showAddOfferDialog ({initProduct, initOffer}) {
      if (this.warehouses.length === 0) {
        return alert('Please set up your warehouses first.')
      }
      if (initProduct) {
        this.initProduct = initProduct
      }
      if (initOffer) {
        this.initOffer = initOffer
      }
      this.addOfferDialog = true
    },
    dispatchAndToast (promise, actionText) {
      return promise
        .catch(error => {
          console.error(error.message)
          this.$store.dispatch('showToast', {info: `${actionText} failed`})
        })
    },
    addOffer (offer) {
      if (this.warehouses.length === 0) {
        return alert('Please set up your warehouses first.')
      }
      if (this.offers.length >= this.maxOfferQty) {
        throw Error(`Reach ${this.maxOfferQty} active offer limit. Please archive old offers. If you need to create more than ${this.maxOfferQty} offers, please contact you account manager.`)
      }
      return this.dispatchAndToast(this.$store.dispatch('addOffer', offer), 'add offer')
    }
  }
}
</script>
