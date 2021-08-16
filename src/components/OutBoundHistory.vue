<template>
  <v-container fluid>
    <v-tabs
        color="transparent"
        v-model="tab"
        show-arrows
      >
        <v-tabs-slider color="primary"></v-tabs-slider>
        <v-tab v-for="tabItem in tabs" :key="tabItem">
          {{ tabItem }}
        </v-tab>
      <v-tabs-items v-model="tab" touchless>
        <v-tab-item v-for="(item, index) in 2" :key="'item' + index">
          <v-layout justify-space-between  align-baseline v-if="index === 0">
            <v-flex class="success--text caption" xs2>
              <span class="realtime-border px-1">REAL TIME</span>
            </v-flex>
            <v-flex xs2 v-if="isWarehouse">
              <v-autocomplete
                :items="warehousesSites"
                item-text="siteName"
                item-value="key"
                v-model="siteKey"
                label="Warehouse site"></v-autocomplete>
            </v-flex>
            <v-flex xs2 v-if="isWarehouse">
              <v-autocomplete
                :items="[{
                  text: '-- All --',
                  value: ''
                }, {
                  text: 'Unpicked',
                  value: 'unpicked'
                }, {
                  text: 'Picked',
                  value: 'picked'
                }]"
                item-text="text"
                item-value="value"
                v-model="type"
                label="Type"></v-autocomplete>
            </v-flex>
            <v-flex xs8 md2 v-if="isWarehouse">
              <v-btn color="primary" @click.stop="showPickUpDialog" :disabled="!selectedShipments.length">Pick up</v-btn>
            </v-flex>
            <v-flex xs8 md2>
              <v-text-field
                append-icon="filter_list"
                label="Search"
                single-line
                clearable
                hide-details
                v-model.trim="filter"
              ></v-text-field>
            </v-flex>
          </v-layout>
          <v-data-table
            v-if="index === 0 && tab === 0"
            :headers="headers"
            :search="filter"
            :items="shipments"
            :pagination.sync="pagination"
            item-key="_key"
            expand
            :select-all="!!isWarehouse"
            v-model="selectedShipments"
            :rows-per-page-items="rowPerPage">
            <template v-slot:items="props">
              <OutboundDraftRow
                v-if="props.item.isDraft && isOrganization"
                :item="props.item"
                :expanded.sync="props.expanded"
                @show-comments="(item) => showDraftComments(item, 'draft')"
                :siteName="getSiteName(props.item.products[0] && props.item.products[0].warehouseSite)"
                @clickUpc="upc => { filter = upc }"/>
              <OutboundShipmentRow
                v-else
                type="active"
                :props="props"
                :pickedUpcs="shipmentToPickedUpcs[props.item._key] || []"
                :item="props.item"
                :expanded.sync="props.expanded"
                :siteName="getSiteName(props.item.products[0] && props.item.products[0].warehouseSite)"
                @show-confirm-dialog="(item) => confirmShipment(item)"                    
                @show-comments-active="(item) => showDraftComments(item, 'active')"
                @show-comments-history="(item) => showDraftComments(item, 'history')"
                @clickUpc="upc => { filter = upc }"/>
            </template>
            <template v-slot:expand="props">
              <v-card>
                <v-card-text>
                  <v-layout justify-space-around>
                    <v-flex sm8>
                      <v-layout>
                        <v-flex sm5 v-if="isOrganization">
                          <v-layout column>
                            <div><b>Note:</b></div>
                            <div style="whiteSpace: pre-wrap; overflow-wrap: break-word; max-width: 30vw;">{{props.item.note}}</div>
                          </v-layout>
                        </v-flex>
                        <v-spacer></v-spacer>
                        <v-flex sm5>
                          <v-layout column>
                            <div><b>Instruction:</b></div>
                            <div style="whiteSpace: pre-wrap; overflow-wrap: break-word; max-width: 30vw;">{{ props.item.isDraft ? props.item.instructionContent : props.item.instruction }}</div>
                            <div v-for="item in props.item.labels" :key="item.orderId" v-if="item.trackingNum">{{item.trackingNum}} -> {{displayPackaging(item.packaging)}}</div>
                          </v-layout>
                        </v-flex>
                        <v-spacer></v-spacer>
                        <v-flex sm5 v-if="isWarehouse">
                          <v-layout column>
                            <v-flex><b>Locations:</b></v-flex>
                            <v-flex>
                              <div v-for="item in props.item.products" :key="item.upc" style="whiteSpace: 'pre-wrap'; overflow-wrap: break-word; ">{{item.name}} ({{item.upc}})&nbsp;&nbsp;&nbsp;----->&nbsp;&nbsp;&nbsp;<span style="background-color: yellow;">{{upcToProductMap[item.upc] && upcToProductMap[item.upc].location && upcToProductMap[item.upc].location.join(', ')}}</span></div>
                            </v-flex>
                          </v-layout>
                        </v-flex>
                      </v-layout>
                    </v-flex>
                  </v-layout>
                </v-card-text>
              </v-card>
            </template>
          </v-data-table>
          <PaginationController
            v-if="index === 1 && tab === 1"
            v-model="archivedShipments"
            getDataActionName="getArchivedShipments"
            :historyLimit="historyLimit"
            isUsingModelInAction
            haveSearchBox
            searchBoxLabel="Search by UPC/ASIN/Order id/Tracking"
            searchBoxHint="This filter only returns shipments created after 01/01/2020"
            :select="isOrganization ? warehouseSelected : selectedOrg">
            <template v-slot:dataTable>
              <v-data-table
                :headers="headers"
                :items="archivedShipments"
                :expand="expand"
                item-key="_key"
                hide-actions>
                <template v-slot:items="props">
                  <OutboundShipmentRow
                    type="history"
                    :item="props.item"
                    :expanded.sync="props.expanded"
                    :siteName="getSiteName(props.item.products[0] && props.item.products[0].warehouseSite)"
                    @show-details="(item) => showDetails(item)"
                    @show-comments-history="(item) => showDraftComments(item, 'history')"/>
                </template>
                <template v-slot:expand="props">
                  <v-card>
                    <v-card-text>
                      <v-layout justify-space-around>
                        <v-flex sm8>
                          <v-layout>
                            <v-flex sm5>
                              <v-layout column v-if="isOrganization">
                                <div><b>Notes:</b></div>
                                <div style="whiteSpace: pre-wrap; overflow-wrap: break-word; max-width: 30vw;">{{props.item.note}}</div>
                              </v-layout>
                            </v-flex>
                            <v-spacer></v-spacer>
                            <v-flex sm5>
                              <v-layout column>
                                <div><b>Instructions:</b></div>
                                <div style="whiteSpace: pre-wrap; overflow-wrap: break-word; max-width: 30vw;">{{props.item.instruction}}</div>
                                <div v-for="item in props.item.labels" :key="item.orderId" v-if="item.trackingNum">{{item.trackingNum}} -> {{displayPackaging(item.packaging)}}</div>
                              </v-layout>
                            </v-flex>
                          </v-layout>
                        </v-flex>
                      </v-layout>
                    </v-card-text>
                  </v-card>
                </template>
              </v-data-table>
            </template>
            <template v-slot:beforeSearchBox>
              <v-flex md4 v-if="isOrganization">
                <v-autocomplete
                  :items="users"
                  item-text="name"
                  item-value="uid"
                  v-model="warehouseSelected"
                  label="User"></v-autocomplete>
              </v-flex>
              <v-flex md4 v-else>
                <v-autocomplete
                  v-model="selectedOrg"
                  :items="organizationSelect"
                  label="Organization"
                  item-text="displayName"
                  item-value="key"></v-autocomplete>
              </v-flex>
            </template>
          </PaginationController>
        </v-tab-item>
      </v-tabs-items>
    </v-tabs>
    <ConfirmShipmentPopup
      v-model="confirmShipmentDialog"
      v-if="confirmShipmentDialog"
      :shipment="shipmentInEdit"/>
    <ChatRoom
      title="Attachment details"
      v-model="photoServiceDialog"
      v-if="photoServiceDialog"
      enableFileUpload
      createConnection
      noLastRead
      v-bind="chatRoomBind"
    >
     <template v-slot:issue>
        <v-card hover raised>
          <v-card-text>
            <v-layout>
              <v-flex xs5 lg3 class="text-xs-left">
                <span class="cardTitle">Shipment ID:</span> {{archivedShipmentInEdit.shipmentKey}}
              </v-flex>
              <v-flex xs6 class="text-xs-left" v-if="archivedShipmentInEdit.trackingNum">
                <span class="cardTitle">Tracking:</span> {{archivedShipmentInEdit.trackingNum}}
              </v-flex>
            </v-layout>
            <div class="cardTitle" style="overflow-wrap: break-word;">
              <span class="cardTitle">Shipment label:</span>
              <v-btn 
                color="primary" 
                flat
                @click="getShipmentLabel(archivedShipmentInEdit)"
              >Download</v-btn>
            </div>
            <div v-if="archivedShipmentInEdit.snRecords.length" class="cardtext"><span class="cardTitle">SN:</span> {{archivedShipmentInEdit.snRecords.join(', ')}}</div>
            <template v-if="outboundAttachments.length">
              <div style="overflow-wrap: break-word;">
                <span class="cardTitle">Photos:</span>
              </div>
              <v-layout row wrap>
                <FsFileChip 
                  v-for="(file, index) in outboundAttachments"
                  :file="file"
                  :key="'file' + index"
                  width="100%"
                  aspect-ratio="1.7"
                  class="ma-2"
                />
              </v-layout>
            </template>
            <div style="overflow-wrap: break-word;" v-if="isWarehouse && archivedShipmentInEdit.workerName">
              <span class="cardTitle">Operator:</span> {{ archivedShipmentInEdit.workerName }} 
            </div>
            <div style="overflow-wrap: break-word;" v-if="isOrganization && archivedShipmentInEdit.creator">
              <span class="cardTitle">Creator:</span> {{ archivedShipmentInEdit.creator }} 
            </div>
            <div style="overflow-wrap: break-word;" v-if="isWarehouse && archivedShipmentInEdit.scannedItems && archivedShipmentInEdit.scannedItems.length">
              <span class="cardTitle">Shipment fulfillment: </span>
            </div>
            <v-data-table
              v-if="isWarehouse && archivedShipmentInEdit.scannedItems && archivedShipmentInEdit.scannedItems.length"
              :headers="[
                { text: 'Upc', value: 'upc', align: 'left', sortable: false },
                { text: 'Required quantity', value: 'requiredQuantity', align: 'left', sortable: false },
                { text: 'Quantity', value: 'quantity', align: 'left', sortable: false }
              ]"
              :items="archivedShipmentInEdit.scannedItems || []"
              item-key="upc"
              hide-actions
            >
              <template v-slot:items="{item}">
                  <td class="text-xs-left">{{ item.upc }}</td>
                  <td class="text-xs-left">{{ item.requiredQuantity }}</td>
                  <td class="text-xs-left">{{ item.quantity }}</td>
              </template>
            </v-data-table>
            <span class="cardTitle" style="overflow-wrap: break-word;" v-if="isWarehouse && archivedShipmentInEdit.uploadedTrackings && archivedShipmentInEdit.uploadedTrackings.length">
              Scanned trackings: 
            </span>
            <span style="overflow-wrap: break-word;" v-if="isWarehouse && archivedShipmentInEdit.scannedItems && archivedShipmentInEdit.scannedItems.length">
              {{ archivedShipmentInEdit.uploadedTrackings && archivedShipmentInEdit.uploadedTrackings.join(', ') }}
            </span>
          </v-card-text>
        </v-card>   
      </template>
    </ChatRoom>
    <ChatRoom
      title="Draft comments"
      v-model="draftCommentDialog"
      v-if="draftCommentDialog"
      enableFileUpload
      createConnection
      :readOnly="tab === 1 && !draftInEdit.isDraft"
      commentsField="draftComments"
      v-bind="chatRoomBind"
    >
     <template v-slot:issue>
        <v-card hover raised>
          <v-card-text>
            <div class="chatroom-text-block">
              <span>Shipment ID: {{ draftInEdit.requestId || draftInEdit._key }}</span>
              <span>CreateTime: {{ toTimestampString(draftInEdit.createTime) }}</span>
            </div>
            <div class="chatroom-text-block">
              <span>Tracking: {{ draftInEdit.trackingNum }}</span>
              <span>Package quantity: {{ draftInEdit.packageQty }}</span>
            </div>
            <div class="chatroom-text-block">
              <span>Total cost: ${{ (Object.values(draftInEdit.products) || []).reduce((acc, item) => acc + (item.toShip * (item.unitCost || 0)), 0).toLocaleString() }}</span>
              <span>Total price: ${{ (Object.values(draftInEdit.products) || []).reduce((acc, item) => acc + (item.toShip * (item.unitPrice || 0)), 0).toLocaleString() }}</span>
            </div>
            <div class="chatroom-text-block">
              <span>Destination: {{ draftInEdit.destination && ((draftInEdit.destination.name === '-- Other --') ? draftInEdit.destination.content : draftInEdit.destination.name) }}</span>
            </div>
            <div>
              Products:
            </div>
            <v-layout>
              <v-flex>
                <v-data-table
                  v-if="JSON.stringify(draftInEdit.products) !== '{}'"
                  :headers="[
                    { text: '#', value: '', align: 'left', sortable: false },
                    { text: 'Product name', value: 'productName', align: 'left', sortable: true },
                    { text: 'UPC', value: '', align: 'left', sortable: false },
                    { text: 'Quantity', value: '', align: 'left', sortable: false },
                    { text: 'Unit cost', value: '', align: 'left', sortable: false },
                    { text: 'Unit price', value: '', align: 'left', sortable: false },
                    { text: 'Total cost', value: '', align: 'left', sortable: false },
                    { text: 'Total price', value: '', align: 'left', sortable: false }
                  ]"
                  :items="Object.values(draftInEdit.products).map(item => {
                    return {...item, productName: getUpcName(item)}
                  })"
                  item-key="fbmKey"
                  class="elevation-1"
                  hide-actions
                >
                  <template v-slot:items="{item, index}">
                      <td class="text-xs-left">{{ index + 1 }}</td>
                      <td class="text-xs-left">{{ item.productName }}</td>
                      <td class="text-xs-left">
                        {{ item.upc }}
                      </td>
                      <td class="text-xs-left">
                        {{ item.toShip }}
                      </td>
                      <td class="text-xs-left">
                        ${{ (item.unitCost || 0).toLocaleString() }}
                      </td>
                      <td class="text-xs-left">
                        ${{ (item.unitPrice || 0).toLocaleString() }}
                      </td>
                      <td class="text-xs-left">
                        ${{ (item.toShip * (item.unitCost || 0)).toLocaleString() }}
                      </td>
                      <td class="text-xs-left">
                        ${{ (item.toShip * (item.unitPrice || 0)).toLocaleString() }}
                      </td>
                  </template>
                </v-data-table>
              </v-flex>
            </v-layout>
            <div class="chatroom-text-block" style="overflow-wrap: break-word; white-space: pre-wrap;">
              <span>Note: {{ draftInEdit.note }}</span>
            </div>
          </v-card-text>
        </v-card>   
      </template>
    </ChatRoom>
    <SimpleTextPopup
      title="Pick up"
      v-model="pickUpDialog"
      v-if="pickUpDialog"
      @popupClose="() => {pickUpDialog = false}"
      :hideRgtBtn="true"
      large>
      <template v-slot:input>
        <v-layout justify-space-between align-baseline>
          <v-flex xs3>
            Current site: <strong>{{ getSiteName(selectedShipments[0] && selectedShipments[0].products[0] && selectedShipments[0].products[0].warehouseSite) }}</strong>
          </v-flex>
          <v-flex xs2>
            <LoaderButton
              buttonText="Confirm pick-up"
              :promiseAwait="pickupItems"/>
          </v-flex>
          <v-flex xs2>
              <v-btn color="primary" @click.stop="printPickupItems()">
              Print
            </v-btn>
          </v-flex>
          <v-flex xs8 md2>
            <v-text-field
              append-icon="filter_list"
              label="Search"
              single-line
              clearable
              hide-details
              v-model.trim="stowFilter"
            ></v-text-field>
          </v-flex>
        </v-layout>
        <WarehouseStowTable
          :upcToQtyMap="upcToQtyMap"
          type="pickup"
          :selectedUpcs.sync="selectedUpcs"
          :filter="stowFilter"/>
      </template>
    </SimpleTextPopup>
  </v-container>
</template>

<script>
import WarehouseStowTable from './WarehouseStowTable'
import MemberTable from './MemberTable'
import ProductWidget from './ProductWidget'
import LoaderButton from './LoaderButton'
import PaginationController from './PaginationController'
import ChatRoom from './ChatRoom'
import FsFileChip from './FsFileChip'
import ConfirmShipmentPopup from './ConfirmShipmentPopup'
import {mediaTools, timeTools} from '@/utils/tools'
import OutboundDraftRow from './OutboundDraftRow'
import OutboundShipmentRow from './OutboundShipmentRow'
import SimpleTextPopup from './SimpleTextPopup'
import printJS from 'print-js'

export default {
  name: 'outBoundHistory',
  components: {
    MemberTable,
    ProductWidget,
    LoaderButton,
    PaginationController,
    FsFileChip,
    ChatRoom,
    ConfirmShipmentPopup,
    OutboundDraftRow,
    OutboundShipmentRow,
    WarehouseStowTable,
    SimpleTextPopup
  },
  mixins: [mediaTools, timeTools],
  data () {
    return {
      tab: 0,
      tabs: [
        'Active', 'History'
      ],
      filter: '',
      stowFilter: '',
      pagination: {},
      rowPerPage: [20, 50, 100, {text: 'All', value: -1}],
      archivedShipments: [],
      historyLimit: 25,
      warehouseSelected: '',
      expand: false,
      confirmShipmentDialog: false,
      keepConfirmDialog: false,
      photoServiceDialog: false,
      outboundAttachments: [],
      archivedShipmentInEdit: {},
      chatRoomBind: {},
      sound: {},
      selectedOrg: '',
      draftCommentDialog: false,
      draftInEdit: {},
      pickUpDialog: false,
      siteKey: '',
      selectedShipments: [],
      selectedUpcs: [],
      type: ''
    }
  },
  computed: {
    headers () {
      if (this.isOrganization) {
        return [
          { text: 'Info', value: '_key', align: 'left', sortable: false, width: '5%' },
          { text: 'Service type', value: 'isExpedited', align: 'left', sortable: false },
          { text: 'Outbound shipment <--> Quantity', value: 'requestId', align: 'left', sortable: false },
          { text: 'Shipment ID', value: 'shipmentId', align: 'left', sortable: false },
          { text: 'Tracking#', value: 'trackingNum', align: 'left', sortable: false },
          this.tab === 0 ? { text: 'Pkg qty', value: 'packageQty', align: 'left', sortable: false, width: '1%' } : 
            { 
              text: `Pkg qty(${this.archivedShipments.reduce((acc, item) => acc + item.packageQty, 0)})`, 
              value: 'packageQty', 
              align: 'left', 
              sortable: false, 
              width: '1%' 
            },
          { text: 'Destination', value: 'destinationForDisplay', align: 'left', sortable: false },
          { text: 'Create Time', value: 'createTime', align: 'left', sortable: false },
          { text: 'Action', value: 'keywordString', align: 'center', sortable: false, width: '25%' }
        ]
      } else {
        return [
          { text: 'Info', value: '_key', align: 'left', sortable: false, width: '5%' },
          { text: 'Service type', value: 'isExpedited', align: 'left', sortable: false },
          { text: 'Outbound shipment <--> Quantity', value: 'requestId', align: 'left', sortable: false, width: '20%' },
          { text: 'Tracking#', value: 'trackingNum', align: 'left', sortable: false },
          this.tab === 0 ? { text: 'Pkg qty', value: 'packageQty', align: 'left', sortable: false, width: '1%' } : 
            { 
              text: `Pkg qty(${this.archivedShipments.reduce((acc, item) => acc + item.packageQty, 0)})`, 
              value: 'packageQty', 
              align: 'left', 
              sortable: false, 
              width: '1%' 
            },
          { text: 'Create Time', value: 'createTime', align: 'left', sortable: false },
          { text: 'Action', value: 'keywordString', align: 'center', sortable: false, width: '20%' }
        ]
      }
    },
    warehousesSites () {
      const allSites = this.isWarehouse ? 
        this.$store.getters.warehousesSites
        :
        this.$store.getters.warehouses.reduce((sum, warehouse) => {
          return [...sum, ...warehouse.sites]
        }, [])
      return [{siteName: '-- All --', key: ''}, ...allSites]
    },
    shipments () {
      let rtn = this.$store.getters.shipmentsAndDrafts
      if (this.siteKey) {
        rtn = rtn
          .filter(item => item.products && item.products[0] && item.products[0].warehouseSite === this.siteKey)
      }
      if (this.type) {
        if (this.type === 'picked') {
          rtn = rtn.filter(item => item.products.some(product => (this.shipmentToPickedUpcs[item._key] || []).includes(product.upc)))
        } else {
          rtn = rtn.filter(item => !item.products.some(product => (this.shipmentToPickedUpcs[item._key] || []).includes(product.upc)))
        }
      }
      return rtn
    },
    isOrganization () {
      return !!this.$store.getters.activeOrganization
    },
    isWarehouse () {
      return !!this.$store.getters.activeWarehouse
    },
    users () {
      return [{name: '-- All --', uid: ''}, ...this.warehouses, ...this.$store.getters.users]
    },
    warehouses () {
      return this.$store.getters.warehouses && this.$store.getters.warehouses.length > 0 ? this.$store.getters.warehouses.map(warehouse => { return {name: warehouse.warehouseName, uid: warehouse.warehouseKey} }) : []
    },
    organizations () {
      return this.$store.getters.sortedWarehouseOrganizations.filter(element => {
        return element.organizationId !== ''
      })
    },
    organizationSelect () {
      return [{displayName: '-- All --', organizationId: '', key: ''}, ...this.organizations]
    },
    lastReadTime () {
      return (this.draftInEdit
        && this.draftInEdit[`lastRead_${this.$store.getters.uid}`]) || new Date('2018-1-1')
    },
    upcToProductMap () {
      return this.$store.getters.upcMap
    },
    generalSettings () {
      return this.$store.getters.warehouseInfo.generalSettings || {}
    },
    shipmentToPickedUpcs () {
      return this.$store.getters.pickupRecords.reduce((acc, item) => {
        return {...acc, ...item.shipmentToPickedUpcs}
      }, {})
    },
    upcToQtyMap () {
      const upcToQtyMap = new Map()
      this.selectedShipments.forEach(shipment => {
        shipment.products.forEach(product => {
          const {upc, toShip} = product
          if (!(this.shipmentToPickedUpcs[shipment._key] || []).includes(upc)) {
            if (!upcToQtyMap.has(upc)) {
              upcToQtyMap.set(upc, {totalQty: 0})
            }
            upcToQtyMap.get(upc).totalQty += toShip
          }
        })
      })
      return upcToQtyMap
    }
  },
  methods: {
    getShipmentLabel (item) {
      item.zipFile && this.$store.dispatch('downloadFile', {fullPath: item.zipFile, name: 'label.zip'})
    },
    add () {
      let archivedShipments = [...this.$store.getters.archivedShipments, ...this.$store.getters.archivedShipments]
      this.$store.commit('setArchivedShipments', archivedShipments)
    },
    checkPhotos (shipment) {
      return shipment.attachments && shipment.attachments.length
    },
    showDetails (shipment) {
      this.archivedShipmentInEdit = shipment
      this.outboundAttachments = shipment.attachments || []
      this.photoServiceDialog = true
      this.chatRoomBind = {
        docPath: ['archivedShipments', shipment._key],
        comments: shipment.comments || [],
        readOnly: !this.isWarehouse && !(shipment.userName === 'self' && !shipment.warehouseKey)
      }
    },
    showDraftComments (item, type = 'active') {
      this.draftInEdit = item
      let docPath
      if (type === 'active') {
        docPath = ['shipments', item._key]
      } else if (type === 'draft') {
        docPath = ['tenants', this.$store.getters.activeOrganization, 'shipmentDrafts', item._key]
      } else {
        docPath = ['archivedShipments', item._key]
      }
      this.chatRoomBind = {
        lastReadTime: type === 'active' ? undefined : new Date(),
        docPath,
        comments: item.comments || [],
        readOnly: false
      }
      this.draftCommentDialog = true
    },
    clearChatRoomBind () {
      this.chatRoomBind = {}
    },
    /** @param {FsFile} file */
    downloadFile (file) {
      return this.$store.dispatch('downloadFile', file)
    },
    getUpcName (product) {
      const {name, upc} = product
      if (this.isWarehouse) return this.$store.getters.getUpcName(upc)
      return name
    },
    displayPackaging (packaging) {
      let {length, width, height} = packaging
      return `${length}"/${width}"/${height}"`
    },
    confirmShipment (item) {
      this.confirmShipmentDialog = true
      this.shipmentInEdit = item
    },
    showPickUpDialog () {
      if (this.selectedShipments.some(shipment => shipment.products[0].warehouseSite !== this.selectedShipments[0].products[0].warehouseSite)) {
        return this.$store.dispatch('showToast', {info: `Please select shipments from the same site.`, level: 'error'})
      }
      this.pickUpDialog = true
    },
    getSiteName (siteKey) {
      if (!siteKey) return ''
      return (this.warehousesSites.find(site => site.key === siteKey) || {siteName: '', key: ''}).siteName
    },
    pickupItems () {
      if (!this.selectedUpcs.length) return Promise.resolve('done')
      return this.$store.dispatch('pickupItems', {
        selectedUpcs: this.selectedUpcs, 
        selectedShipments: this.selectedShipments
      })
    },
    printPickupItems () {
      if (!this.selectedUpcs.length) return Promise.resolve('done')
      let title = 'Pick list'
      let items = this.selectedUpcs.map(upcItem => {
        let {upc, productName: name, totalQty: quantity, location} = upcItem
        return {upc, name, quantity, location: (location || []).join(',')}
      })
      printJS({
        printable: items,
        type: 'json',
        properties: ['upc', 'name', 'quantity', 'location'],
        header: `<h3 class="custom-h3">${title}</h3>`,
        style: '.custom-h3 { color: black; }',
        gridHeaderStyle: 'text-align: center; border: 1px solid',
        gridStyle: 'text-align: center; border: 1px solid'})
    }
  },
  mounted () {
    this.sound = {
      hint: this.hintSound(),
      warning: this.warningSound()
    }
    this.siteKey = this.generalSettings.defaultSite || ''
  },
  destroyed () {
    this.sound = {}
    this.closeSound()
  }
}
</script>

<style>
.thinBox .input-group__input {
  border: 1px solid rgba(0,0,0,.54) !important;
}
.text-capitalize .v-chip__content {
  text-transform: capitalize !important;
}
.shipment-id {
  max-width: 220px;
  overflow-wrap: break-word;
}

.outbound.confirm .v-input--selection-controls {
  margin-top: 0px !important;
}
.outbound.confirm .container {
  padding: 0px 12px !important;
}
.chatroom-text-block span {
  display: inline-block; 
  width: 45%;
}
.cardTitle {
  font-weight: bold;
  font-size: 15px;
}

</style>
