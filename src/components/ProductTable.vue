<template>
  <v-data-table
    :headers="headersFBM"
    :items="product"
    item-key="key"
    class="elevation-2 myDense"
    :search="filter"
    ref="TaskTable"
    :expand="expand"
    :pagination.sync="pagination"
    :rows-per-page-items="rowPerPage">
    <template v-slot:items="props">
      <tr @click="props.expanded = !props.expanded">
        <td class="subheading">{{ props.index + 1}}</td>
        <td class="text-xs-left">{{ props.item.userName }}</td>
        <td class="text-xs-left">{{ props.item.siteName || 'warehouse' }}</td>
        <td class="text-xs-left">{{ props.item.quantity }}</td>
      </tr>
    </template>
  </v-data-table>
</template>

<script>

export default {
  name: 'productTable',
  data () {
    return {
      rowPerPage: [7, 15, 30, {text: 'All', value: -1}],
      pagination: {
        sortBy: 'id'
      },
      filter: '',
      headersFBM: [
        { text: '#', align: 'left', sortable: false, width: '5%' },
        { text: 'User', value: 'uid', align: 'left', sortable: false },
        { text: 'Site', value: 'siteName', align: 'left', sortable: false },
        { text: 'Quantity', value: 'quantity', align: 'left', sortable: false }
      ],
      expand: false
    }
  },
  props: {
    product: {
      type: Array,
      default: function () {
        return []
      }
    }
  }
}
</script>
