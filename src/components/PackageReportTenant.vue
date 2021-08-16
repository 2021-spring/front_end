<script>
import PackageReportWarehouse from './PackageReportWarehouse'

export default {
  name: 'PackageReportTenant',
  extends: PackageReportWarehouse,
  data () {
    return {
      headers: [
        { text: 'Index', align: 'left', sortable: false, value: 'id' },
        { text: 'Warehouse', align: 'left', sortable: false, value: 'title' },
        { text: 'Start date', align: 'left', sortable: true, value: 'startDate' },
        { text: 'End date', align: 'left', sortable: true, value: 'endDate' },
        { text: 'Action', value: 'createTime', align: 'center', sortable: false, width: '10%' }
      ]
    }
  },
  methods: {
    getEntityId (item) {
      return this.warehouses.find(warehouse => warehouse.warehouseKey === item.warehouseKey)['warehouseName']
    },
    addReport () {
      let payload = {
        warehouseName: this.warehouseSelected.warehouseName,
        warehouseKey: this.warehouseSelected.warehouseKey,
        timeZoneOffset: new Date().getTimezoneOffset(),
        startDate: this.startDate,
        endDate: this.endDate
      }
      return this.$store.dispatch('addPackageReportTenant', payload)
    },
    deleteReport (item) {
      if (!confirm('Are you sure to delete this report?')) return Promise.resolve()
      return this.$store.dispatch('deletePackageReportTenant', item)
    }
  }
}
</script>
