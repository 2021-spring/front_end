<template>
  <SimpleTextPopup
    title="Expense History"
    v-model="value"
    @popupClose="$emit('input', false)"
    :hideRgtBtn="true"
    medium
  >
    <template v-slot:input>
      <v-data-table
        :headers="historyHeaders"
        :items="expenseHistory"
        class="elevation-2 myDense"
      >
        <template v-slot:items="props">
            <td class="subheading">{{ props.index + 1}}</td>
            <td class="text-xs-left">{{ props.item.dateKeyStr }}</td>
            <td class="text-xs-left">{{ props.item.expense }}</td>
        </template>
      </v-data-table>
    </template>
  </SimpleTextPopup>
</template>

<script>
import SimpleTextPopup from './SimpleTextPopup'

export default {
  name: 'ExpenseHistoryPopup',
  components: {
    SimpleTextPopup
  },
  data () {
    return {
      historyHeaders: [
        { text: 'ID#', align: 'left', sortable: false, value: 'key' },
        { text: 'Date', value: 'dateKeyStr', align: 'left', sortable: false },
        { text: 'Expense', value: 'expense', align: 'left', sortable: false }
      ]
    }
  },
  props: {
    value: Boolean,
    expenseHistory: Array
  }
}
</script>
