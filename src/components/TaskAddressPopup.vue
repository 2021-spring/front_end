<template>
  <SimpleTextPopup
    title="Address"
    v-model="value"
    @popupClose="$emit('input', false)"
    hideRgtBtn
    large
    scrollToBottom>
    <template v-slot:input>
      <v-data-table
        :headers="addressHeaders"
        :items="sites"
        hide-actions
        class="elevation-1"
      >
        <template v-slot:items="props">
          <td class="subheading">{{ props.item.warehouseName ? props.item.warehouseName + ' - ' : '' }} {{props.item.siteName }}</td>
          <td class="text-xs-left">{{ props.item.orgId }}</td>
          <td class="text-xs-left">
            {{ props.item.address1 }},
            {{ props.item.orgId ? ('Unit ' + props.item.orgId + ', ') : ''}}
            {{ props.item.city }}, 
            {{ props.item.state }} {{props.item.zip }}
          </td>
        </template>
      </v-data-table>
    </template>
  </SimpleTextPopup>
</template>

<script>
import SimpleTextPopup from './SimpleTextPopup'

export default {
  name: 'TaskAddressPopup',
  components: {SimpleTextPopup},
  computed: {
    addressHeaders () {
      return [
        { text: 'Site name', align: 'left', sortable: false, value: 'siteName' },
        { text: 'Organization id', value: 'orgId', width: '5%', align: 'left', sortable: false },
        { text: 'Address', value: 'address1', align: 'left', sortable: false }
      ]
    }
  },
  props: {
    value: Boolean,
    sites: {
      type: Array,
      default () {
        return []
      }
    }
  }

}
</script>

<style>

</style>
