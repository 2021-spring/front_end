<template>
  <div>
    <PaginationController
      ref="historyTable"
      v-model="historyScannedItems"
      getDataActionName="getHistoryScannedItems"
      :historyLimit="historyLimit"
      :haveStartDate="filterBy !== 'tracking'"
      :haveNoEndDate="filterBy === 'tracking'"
      :actionPredicates="historyItemPredicates"
    >
      <template v-slot:dataTable>
        <v-data-table
          :headers="headers"
          :items="historyScannedItems"
          item-key="_key"
          hide-actions
        >
          <template v-slot:items="props">
            <td class="text-xs-left">{{ props.item.type }}</td>
            <td class="text-xs-left">{{ carrierMap[props.item.carrier] }}</td>
            <td class="text-xs-left">{{ serviceTypeMap[props.item.serviceType] }}</td>
            <td class="text-xs-left">{{ props.item.trackings && props.item.trackings.length }}</td>
            <td class="text-xs-left" >{{ toDateYYYYMMDDHHmm(props.item.createTime) }}</td>
            <td class="text-xs-left">{{ props.item.workerName }}</td>
            <td class="text-xs-center">
              <v-layout justify-center>
                <v-btn color="primary" flat @click.stop="showEditlDialog(props.item)">Edit</v-btn>
                <v-btn color="primary" flat @click.stop="showDetailDialog(props.item)">Details</v-btn>
              </v-layout>
            </td>
          </template>
        </v-data-table>
      </template>
      <template v-slot:beforeMenu>
        <v-layout>
          <v-flex xs3 mr-3>
            <v-autocomplete
              :items="[
                {name: 'Type', value: 'type'}, 
                {name: 'Tracking', value: 'tracking'}
              ]"
              item-value="value"
              item-text="name"
              v-model="filterBy"
              label="Filter by"></v-autocomplete>
          </v-flex>
          <v-flex xs3 mr-3 v-if="filterBy === 'type'">
            <v-select
              :items="[
                {name: 'Inbound', value: 'inbound'}, 
                {name: 'Outbound', value: 'outbound'}, 
              ]"
              item-value="value"
              item-text="name"
              v-model="typeFilter"
              label="Type"/>
          </v-flex>
          <v-flex xs3 v-if="filterBy === 'type'">
            <v-autocomplete
              :items="[
                {name: '-- ALL --', value: ''}, 
                ...Object.entries(carrierMap).map(([key, value]) => {
                  return {
                    name: value,
                    value: key
                  }
                })
              ]"
              item-value="value"
              item-text="name"
              v-model="carrierFilter"
              label="Carrier"></v-autocomplete>
          </v-flex>
          <v-flex xs5 v-else>
            <v-text-field
              v-model="trackingFilter"
              @keyup.enter="() => $refs['historyTable'].$$initiateTable()"
              label="Search by tracking"/>
          </v-flex>
        </v-layout>
      </template>
    </PaginationController>
    <PrescanHistoryEditPopup
      v-model="itemEditDialog"
      v-if="itemEditDialog"
      :item="itemInEdit"
      :carrierMap="carrierMap"
      :serviceTypeMap="serviceTypeMap"
      @onSubmitted="updateItem"/>
    <ChatRoom
      title="Details"
      v-model="itemDetailDialog"
      v-if="itemDetailDialog"
      enableFileUpload
      createConnection
      v-bind="chatRoomBind"
    >
     <template v-slot:issue>
        <v-card hover raised>
          <v-card-text>
            <v-layout row wrap>
              <v-flex xs6>
                <strong>Create time: </strong>&nbsp; {{ toDateYYYYMMDDHHmm(itemInEdit.createTime) }}
              </v-flex>
              <v-flex xs6>
                <strong>Quantity: </strong>&nbsp; {{ itemInEdit.trackings && itemInEdit.trackings.length }}
              </v-flex>
              <v-flex xs6>
                <strong>Type: </strong>&nbsp; {{ itemInEdit.type }}
              </v-flex>
              <v-flex xs6>
                <strong>Carrier: </strong>&nbsp; {{ itemInEdit.carrier }}
              </v-flex>
              <v-flex xs6>
                <strong>Worker name: </strong>&nbsp; {{ itemInEdit.workerName }}
              </v-flex>
              <v-flex xs6>
                <strong>Service type: </strong>&nbsp; {{ serviceTypeMap[itemInEdit.serviceType] }}
              </v-flex>
            </v-layout>
            <v-layout row wrap>
              <v-flex>
                <strong>Note: </strong>
              </v-flex>
            </v-layout>
            <v-layout>
              <v-flex style="white-space: pre-wrap; overflow: auto; word-wrap: break-word;">{{ itemInEdit.note }}</v-flex>
            </v-layout>
            <v-divider my-1></v-divider>

            <v-layout>
              <v-flex>
                <strong>Trackings:</strong>
              </v-flex>
            </v-layout>
            <v-layout row wrap>
              <v-flex xs4 v-for="tracking in itemInEdit.trackings" :key="tracking">
                <span :class="(itemInEdit.uploadedTrackings || []).includes(tracking) || itemInEdit.type === 'outbound' ? '' : 'non-uploaded-tracking'">{{ tracking }}</span>
              </v-flex>
            </v-layout>
            <v-layout row wrap>
              <FsFileChip 
                v-for="(file, index) in itemInEdit.uploadedFiles"
                :file="file"
                :key="'file' + index"
                width="100%"
                aspect-ratio="1.7"
                class="ma-2"
              />
            </v-layout>
          </v-card-text>
        </v-card>   
      </template>
    </ChatRoom>
  </div>
</template>

<script>

import {timeTools} from '@/utils/tools'
import PaginationController from './PaginationController'
import ChatRoom from './ChatRoom'
import SimpleTextPopup from './SimpleTextPopup'
import PrescanHistoryEditPopup from './PrescanHistoryEditPopup'
import FsFileChip from './FsFileChip'

export default {
  name: 'PrescanHistoryTab',
  components: {
    PaginationController,
    SimpleTextPopup,
    PrescanHistoryEditPopup,
    ChatRoom,
    FsFileChip
  },
  mixins: [
    timeTools
  ],
  data () {
    return {
      historyScannedItems: [],
      historyLimit: 25,
      typeFilter: 'inbound',
      carrierFilter: '',
      filterBy: 'type',
      trackingFilter: '',
      itemInEdit: {},
      itemDetailDialog: false,
      itemEditDialog: false,
      chatRoomBind: {}
    }
  },
  computed: {
    historyItemPredicates () {
      if (this.filterBy === 'type') {
        let rtn = [{
          field: 'type',
          compare: '==',
          value: this.typeFilter
        }]
        if (this.carrierFilter) {
          rtn.push({
            field: 'carrier',
            compare: '==',
            value: this.carrierFilter
          })
        }
        return rtn
      }
      if (this.trackingFilter) {
        return [{
          field: 'trackings',
          compare: 'array-contains',
          value: this.trackingFilter.trim().toUpperCase()
        }]
      }
      return []
    },    
    packageQtySum () {
      return this.historyScannedItems.reduce((acc, item) => acc + item.trackings.length, 0)
    },
    headers () {
      return [
        { text: 'Type', value: 'type', align: 'left', sortable: false },
        { text: 'Carrier', value: 'carrier', align: 'left', sortable: false },
        { text: 'Service type', value: 'serviceType', align: 'left', sortable: false },
        { text: `Package qty (${this.packageQtySum})`, value: '', align: 'left', sortable: false },
        { text: 'Create Time', value: 'createTime', align: 'left', sortable: false },
        { text: 'Operator', value: 'workerName', align: 'left', sortable: false },
        { text: 'Action', value: '', align: 'center', sortable: false, width: '10%' }
      ]
    }
  },
  methods: {
    uploadScannedTrackings () {
      if (!this.trackings) return this.$store.dispatch('showToast', {info: `Empty tracking.`, level: 'error'})
      return this.$store.dispatch('uploadScannedTrackings', {
        trackings: this.trackings, 
        type: this.isInbound ? 'inbound' : 'outbound',
        carrier: this.carrier,
        uploadedFiles: this.uploadedFiles,
        serviceType: this.serviceType
      })
        .then(() => {
          this.$store.dispatch('showToast', {info: `Upload success.`, level: 'success'})
          this.trackings = ''
          this.$refs.fileUploader.$$cleanData()
          this.carrier = 'usps'
          this.serviceType = 'all'
        })
    },
    downloadFiles (item) {
      item.zipFile && this.$store.dispatch('downloadFile', {
        fullPath: item.zipFile, 
        name: 'file.zip'
      })
    },
    showDetailDialog (item) {
      this.itemInEdit = item
      this.itemDetailDialog = true
      this.chatRoomBind = {
        docPath: ['warehouses', this.$store.getters.activeWarehouse, 'scannedTrackings', item._key],
        comments: item.comments || []
      }
    },
    showEditlDialog (item) {
      this.itemInEdit = item
      this.itemEditDialog = true
    },
    updateItem (e) {
      const target = this.historyScannedItems.find(item => item === this.itemInEdit)
      const {isInbound} = e
      Object.assign(target, {...e, type: isInbound ? 'inbound' : 'outbound'})
    }
  },
  props: {
    carrierMap: Object,
    serviceTypeMap: Object
  }
}
</script>

<style>
.non-uploaded-tracking {
  border: 1px solid;
  padding: 0 3px;
  border-color: deepskyblue;
}
</style>
