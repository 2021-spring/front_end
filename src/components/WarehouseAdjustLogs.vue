<script>
import WarehouseChangeLogs from './WarehouseChangeLogs'

export default {
  name: 'WarehouseAdjustLogs',
  extends: WarehouseChangeLogs,
  data () {
    return {
      title: 'Inventory change logs',
      actionName: 'getAdjustLogs',
      headers: [
        { text: '#', align: 'left', sortable: false, width: '5%' },
        { text: 'Create time', value: 'uid', align: 'left', sortable: false },
        { text: 'From', value: 'price', align: 'left', sortable: false, width: '20%' },
        { text: 'To', value: 'quantity', align: 'left', sortable: false, width: '20%' },
        { text: 'Operator', value: '', align: 'left', sortable: false },
        { text: 'Site name', value: 'createTime', align: 'left', sortable: false },
        { text: 'Note', value: 'note', align: 'left', sortable: false }
      ]
    }
  },
  computed: {
    logs () {
      return this.changeLogs.map(item => {
        item.siteName = item.actionPayload[0].siteName
        item.actionPayload.forEach(ele => {
          ele.organizationId = this.organizationKeyToId.get(ele.organizationKey)
        })
        item.beforeValue.forEach(ele => {
          ele.organizationId = this.organizationKeyToId.get(ele.organizationKey)
        })
        return item
      })
    }
  }
}
</script>
