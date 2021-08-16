<script>
import ProductTransferTenant from './ProductTransferTenant'

export default {
  name: 'ProductTransferWarehouse',
  extends: ProductTransferTenant,
  data () {
    return {
      tabs: ['History'],
      types: [{name: '-- All --', type: 0}, {name: 'Transaction ID', type: 3}, {name: 'Organization', type: 4}]
    }
  }
}
</script>
