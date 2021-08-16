<script>
import BillingSettings from './BillingSettings'

export default {
  name: 'BillingSettingsDisplay',
  extends: BillingSettings,
  computed: {
    warehouseLimitedInfo () {
      return this.selectedWarehouseLimitedInfo
    }
  },    
  props: {
    selectedWarehouseLimitedInfo: Object
  }
}
</script>
