<template>
  <SimpleTextPopup
    :title="title"
    v-model="value"
    @popupClose="$emit('input', false)"
    hideRgtBtn
    :outsideScrollToBottom="outsideScrollToBottom"
    large>
    <template v-slot:input>
      <v-container>
        <PaginationController
          v-model="changeLogs"
          :getDataActionName="actionName"
          :historyLimit="historyLimit"
          haveSearchBox
          searchBoxLabel="UPC"
          haveNoEndDate
          :outsideScrollToBottom="popupToBottom"
        >
          <template v-slot:dataTable>
            <v-data-table
              :headers="headers"
              :items="logs"
              class="elevation-2 myDense"
              hide-actions>
              <template v-slot:items="props">
                <td class="subheading">
                  <v-layout row no-wrap>
                    {{ props.index + 1}}
                    <v-icon color="red" v-if="props.item.beforeValue[0].isAbnormal">flag</v-icon>
                  </v-layout>
                </td>
                <td class="text-xs-left">{{ toTimestampString(props.item.createTime) }}</td>
                <td v-if="headers[2].text === 'Tracking'" class="text-xs-left">{{ props.item.tracking }}</td>
                <td class="text-xs-left">                   
                  <div
                    v-for="(item, index) in props.item.beforeValue" 
                    :key="'item' + index"
                  >
                    <v-layout>{{upcMap[item.upc] ? upcMap[item.upc].description : 'New product'}}</v-layout>
                    <v-layout :class="item.upc !== props.item.actionPayload[index].upc ? 'font-green' : ''">UPC: {{item.upc}}</v-layout>
                    <v-layout :class="item.quantity !== props.item.actionPayload[index].quantity ? 'font-green' : ''">Quantity: {{item.quantity}}</v-layout>
                    <template v-if="item.isAbnormal">
                      <v-layout 
                        :class="item.abnormalQty !== props.item.actionPayload[index].abnormalQty ? 'font-green' : ''"
                        >Abnormal quantity: {{item.abnormalQty}}</v-layout>
                      <v-layout 
                        :class="item.normalQty !== props.item.actionPayload[index].normalQty ? 'font-green' : ''"
                        >Normal quantity: {{item.normalQty}}</v-layout>
                    </template>
                    <v-layout :class="item.organizationId !== props.item.actionPayload[index].organizationId ? 'font-green' : ''">Organization ID: {{item.organizationId}}</v-layout>
                  </div> 
                </td>
                <td class="text-xs-left">                   
                  <div
                    v-for="(item, index) in props.item.actionPayload" 
                    :key="'item' + index"
                  >
                    <v-layout>{{upcMap[item.upc] ? upcMap[item.upc].description : 'New product'}}</v-layout>
                    <v-layout>UPC: {{item.upc}}</v-layout>
                    <v-layout>Quantity: {{item.quantity}}</v-layout>
                    <template v-if="item.isAbnormal">
                      <v-layout 
                        >Abnormal quantity: {{item.abnormalQty}}</v-layout>
                      <v-layout 
                        >Normal quantity: {{item.normalQty}}</v-layout>
                    </template>
                    <v-layout>Organization ID: {{item.organizationId}}</v-layout>
                  </div> 
                </td>
                <td class="text-xs-left">{{ props.item.userInfo.userName }}</td>
                <td class="text-xs-left">{{ props.item.siteName }}</td>
                <td v-if="actionName === 'getAdjustLogs'" style="white-space: pre-wrap;" :class="noteClass">{{ props.item.note }}</td>
              </template>
            </v-data-table>
          </template>
        </PaginationController>
      </v-container>
    </template>
  </SimpleTextPopup>
</template>

<script>
import SimpleTextPopup from './SimpleTextPopup'
import PaginationController from './PaginationController'
import {timeTools} from '../utils/tools'

export default {
  name: 'WarehouseChangelogs',
  components: {
    SimpleTextPopup,
    PaginationController
  },
  mixins: [timeTools],
  data () {
    return {
      headers: [
        { text: '#', align: 'left', sortable: false, width: '5%' },
        { text: 'Create time', value: 'uid', align: 'left', sortable: false },
        { text: 'Tracking', value: 'siteName', align: 'left', sortable: false },
        { text: 'Before', value: 'price', align: 'left', sortable: false, width: '20%' },
        { text: 'After', value: 'quantity', align: 'left', sortable: false, width: '20%' },
        { text: 'Operator', value: '', align: 'left', sortable: false },
        { text: 'Site name', value: 'createTime', align: 'left', sortable: false }
      ],
      changeLogs: [],
      historyLimit: 20,
      popupToBottom: false,
      actionName: 'getChangeLogs',
      title: 'Change logs'
    }
  },
  computed: {
    logs () {
      return this.changeLogs.map(item => {
        item.tracking = item.actionPayload[0].trackings[0]
        item.siteName = item.actionPayload[0].siteName
        item.actionPayload.forEach(ele => {
          ele.organizationId = this.organizationKeyToId.get(ele.organizationKey)
        })
        item.beforeValue.forEach(ele => {
          ele.organizationId = this.organizationKeyToId.get(ele.organizationKey)
        })
        return item
      })
    },
    organizationKeyToId () {
      return this.$store.getters.organizationKeyToId
    },
    upcMap () {
      return this.$store.getters.upcMap
    },
    noteClass () {
      return this.$vuetify.breakpoint.smAndDown ? 'offerLink-small' : (this.$vuetify.breakpoint.mdOnly ? 'offerLink-medium' : (this.$vuetify.breakpoint.lgOnly ? 'offerLink-large' : 'offerLink-xlarge'))
    }
  },
  methods: {
    outsideScrollToBottom (flag) {
      this.popupToBottom = flag
    }
  },
  props: {
    value: Boolean
  }
}
</script>

<style>
.offerLink-xlarge, .offerLink-xlarge .offer-widget {
  overflow-wrap: break-word !important;
  max-width: 30vw !important;
  white-space: pre-wrap;
}

.offerLink-large, .offerLink-large .offer-widget {
  overflow-wrap: break-word !important;
  max-width: 20vw !important;
  white-space: pre-wrap;
}

.offerLink-medium, .offerLink-medium .offer-widget {
  overflow-wrap: break-word !important;
  max-width: 15vw !important;
  white-space: pre-wrap;
}

.offerLink-small, .offerLink-small .offer-widget {
  overflow-wrap: break-word !important;
  max-width: 15vw;
  white-space: pre-wrap;
}
</style>
