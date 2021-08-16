<script>
import UpcMainTab from './UpcMainTabItem'
import { deepEqual } from '@/utils/tools'

export default {
  name: 'UpcSkuTabItem',
  extends: UpcMainTab,
  data () {
    return {
      mode: 'sku',
      addItemBtnText: 'Add SKU',
      pagination: {
        sortBy: 'sku'
      },
      headers: [
        { text: 'SKU', sortable: false, value: 'sku', width: '15%' },
        { text: 'Organization', sortable: false, value: 'organizationKey' },
        { text: 'Description', sortable: false, value: 'description' },
        { text: 'Size', sortable: false, value: 'size', width: '20%' },
        { text: 'Action', sortable: false, value: 'action', width: '10%' }
      ]
    }
  },
  computed: {
    items () {
      return this.isEditMode ? this.cachedItems : this.skus
    },
    skus () {
      return this.$store.getters.tempSkus
    },
    skuMap () {
      return this.$store.getters.tempSkuMap
    }
  },
  methods: {
    showAddItemDialog () {
      this.$emit('showAddSkuDialog')
    },
    deleteItem (payload) {
      if (confirm('Are you sure to delete this SKU?')) {
        this.$store.dispatch('deleteTempSku', payload)
      }
    },
    hasChangedItems () {
      return false
    },
    getChangedItems () {
      return this.cachedItems.filter(item => { return !deepEqual(this.skuMap[`${item.organizationKey}_${item.sku}`], item) })
    },
    enterEditData () {
      this.cachedItems = this.skus.map(sku => { 
        if (sku.size) {
          sku.size = this.sizeToSortKey.get(sku.size)
        }
        return {...sku} 
      })
      if (!this.cachedItems) this.cachedItems = []
      this.isEditMode = true
    },
    leaveEditMode () {
      this.isEditMode = false
      this.cachedItems = []
      this.loading = false
    },
    cancelEditData () {
      if (this.hasChangedItems() && !confirm('Do you want to cancel all changes?')) return
      this.leaveEditMode()
    },
    saveEditData () {
      let changedItems = this.getChangedItems()
      const hasChangedItems = !!changedItems.length
      if (hasChangedItems && !confirm('Do you want to save all changes?')) return
      if (this.cachedItems.some(sku => (sku.size === 'custom' && !sku.unitFee))) {
        return alert('Custom size skus must have a unit fee.')
      }
      this.loading = true
      if (changedItems.length === 0) {
        this.leaveEditMode()
        return
      }
      return Promise.all(changedItems.map(item => {
        return this.$store.dispatch('updateTempSku', item)
      }))
        .then(() => {
          this.leaveEditMode()
        })
    }
  },
  props: {
    
  }
}
</script>
