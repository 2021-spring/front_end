<template>
  <FormSubmitPopup
    title="Confirm Shipment"
    v-model="value"
    :large="$vuetify.breakpoint.mdAndDown"
    :medium="$vuetify.breakpoint.lgAndUp"
    :rightMethod="onSubmitted"
    @popupClose="$emit('input', false)"      
    rightButtonText="Submit"
    :rightButtonDisabled="rightBtnDisabled"
    hasAlert
  >
    <template v-slot:input>
      <v-alert
        v-model="errorAlert"
        dismissible
        type="error">{{errorMessage}}</v-alert>
      <v-stepper 
        v-model="step"
        non-linear
      >
        <v-stepper-header>
          <v-stepper-step step="1" editable v-if="activateAdvancedOutboundMode" @click="focusOnTextBox">Scan upc/tracking</v-stepper-step>
          <v-stepper-step :step="activateAdvancedOutboundMode ? '2' : '1'" editable>Shipment info</v-stepper-step>
        </v-stepper-header>

        <v-stepper-items>
          <v-stepper-content step="1" v-if="activateAdvancedOutboundMode">
            <div>
              <v-card color="grey lighten-4" flat>
                <v-card-text>
                  <v-layout>
                    <v-text-field
                      id="inputBox"
                      label="Barcode"
                      v-model="barcode"
                      @keyup.enter="addBarcode"></v-text-field>
                    <!-- routing issue unsolved, hack here for product use -->
                    <v-text-field v-show="false"></v-text-field>
                  </v-layout>
                </v-card-text>  
              </v-card>
              <v-data-table
                :headers="[
                  { text: 'Product desc', value: 'upc', align: 'left', sortable: false },
                  { text: 'Upc', value: 'upc', align: 'left', sortable: false },
                  { text: 'Location', value: '', align: 'left', sortable: false },
                  { text: 'Required quantity', value: '', align: 'left', sortable: false },
                  { text: 'Quantity', value: 'quantity', align: 'left', sortable: false }
                ]"
                :items="Object.entries(scannedItemMap)"
                item-key="upc"
                hide-actions
              >
                <template v-slot:items="{item}">
                  <tr :class="isUpcFulfilled(item[0]) ? '' : 'fulfillment_list'">
                    <td class="text-xs-left">{{ upcToProductMap[item[0]] ? upcToProductMap[item[0]].description : 'new product' }}</td>
                    <td class="text-xs-left">{{ item[0] }}</td>
                    <td class="text-xs-left">{{ upcToProductMap[item[0]] && upcToProductMap[item[0]].location && upcToProductMap[item[0]].location.join(', ') }}</td>
                    <td class="text-xs-left">{{ upcMap[item[0]] }}</td>
                    <td class="text-xs-left">
                      <v-edit-dialog
                        :return-value="item[1]"
                        v-on:update:returnValue="quantityChanged($event, item)"
                        large
                        lazy
                        persistent
                      > <div>{{ item[1] }}</div>
                        <template v-slot:input>
                          <div class="mt-3">Update quantity</div>
                          <v-text-field
                            label="Edit"
                            v-model.number="scannedItemMap[item[0]]"
                            single-line
                            mask="#######"
                          ></v-text-field>
                        </template>
                      </v-edit-dialog>
                    </td>
                  </tr>
                </template>
              </v-data-table>
              <v-divider class="mt-2"></v-divider>
              <v-layout>
                <v-combobox
                  v-model="trackings"
                  label="Trackings"
                  chips
                  multiple
                  deletable-chips
                  readonly
                  :suffix="trackings.length.toString()"
                >
                  <template v-slot:selection="data">
                    <v-chip
                      :selected="data.selected"
                      close
                      @input="removeChip(data.item)"
                      :color="uploadedTrackings.has(data.item.toUpperCase()) ? 'red' : ''"
                    >
                      <strong>{{ data.item }}</strong>
                    </v-chip>
                  </template>
                </v-combobox>
              </v-layout>
            </div>
          </v-stepper-content>
          <v-stepper-content :step="activateAdvancedOutboundMode ? '2' : '1'">
            <div class="outbound confirm">
              <v-expansion-panel 
                v-model="panel"
                expand
              >
                <v-expansion-panel-content 
                  v-if="shipmentServiceSet.size"
                  key="requestServices"
                >
                  <template v-slot:header>
                    <div text-xs-center><b>Requested services:</b></div>
                  </template>
                  <v-card >
                    <v-container style="padding: 0px 12px">
                      <v-layout 
                        v-if="shipmentServices && shipmentServices.length"
                        wrap
                      >
                        <v-flex md4 v-for="item in shipmentServices" :key="item">
                          <v-checkbox 
                            :label="capitalize(item)" 
                            v-model="selectedRequiredServices"
                            :value="item"
                            @change="(e) => onServiceChange(e, item)"></v-checkbox>
                        </v-flex>
                      </v-layout>
                    </v-container>
                  </v-card>       
                </v-expansion-panel-content>
                <v-expansion-panel-content
                  key="moreServices"
                >
                  <template v-slot:header>
                    <div text-xs-center><b>More services:</b></div>
                  </template>
                  <v-card>
                    <v-container style="padding: 0px 12px;">                  
                      <v-layout justify-start v-if="complimentaryServices && complimentaryServices.length" wrap>
                        <v-flex md4 v-for="item in complimentaryServices" :key="item">
                          <v-checkbox 
                            :label="capitalize(item)" 
                            v-model="selectedComplimentServices"
                            :value="item"></v-checkbox>
                        </v-flex>
                        <v-flex v-if="isWarehouse" md4>
                          <v-checkbox 
                            label="Extra fee" 
                            v-model="hasExtraFee"></v-checkbox>
                          <v-text-field
                            v-if="hasExtraFee"
                            label="Total extra fee" 
                            v-model.number="extraFee"
                            prefix="$"
                          ></v-text-field>
                        </v-flex>
                      </v-layout>
                    </v-container>
                  </v-card>
                </v-expansion-panel-content>
                <v-expansion-panel-content 
                  v-if="shipment.note || shipment.instruction"
                  key="noteAndInstruction"
                >
                  <template v-sholt:input>
                    <div slot="header"><b> Tenant note & instruction </b></div>
                  </template>
                  <v-card>
                    <v-container style="padding: 0px 12px;">
                      <v-layout v-if="shipment.note">
                        <v-flex>
                          <div><b>Note:</b></div>
                          <div style="whiteSpace: pre-wrap; overflow-wrap: break-word; max-width: 30vw;">{{shipment.note}}</div>
                        </v-flex>
                      </v-layout>
                      <v-layout v-if="shipment.instruction">
                        <v-flex>
                          <div><b>Instruction:</b></div>
                          <div style="whiteSpace: pre-wrap; overflow-wrap: break-word; max-width: 30vw;">{{shipment.instruction}}</div>
                        </v-flex>
                      </v-layout>
                    </v-container>
                  </v-card>
                </v-expansion-panel-content>
              </v-expansion-panel>
              <v-layout row wrap>
                <v-flex xs12 v-if="selectedAllServices.includes('photo')">
                  <UploadFileWidget
                    v-model="attachments"
                    :maxFiles="60"
                    type="shipment"
                    :removeFilesUponUnmounted="removeFilesUponUnmounted"
                    @filesStatus="(status) => {
                      rightBtnDisabled = status !== 'done' && status !== 'success'
                    }"
                  />
                </v-flex>
                <v-flex xs12 v-if="selectedAllServices.includes('SN')">
                  <v-combobox
                    :append-icon="undefined"
                    v-model="snRecords"
                    label="SN"
                    chips
                    multiple
                    deletable-chips
                    @keyup.enter="playSound('hint')"
                    :suffix="snRecords.length.toString()"
                    clearable></v-combobox>
                </v-flex>
                <v-flex xs12>
                  <v-textarea
                    label="Note"
                    outline
                    v-model="note"
                    class="thinBox"></v-textarea>
                </v-flex>
              </v-layout>
            </div>
          </v-stepper-content>
        </v-stepper-items>
      </v-stepper>
    </template>
    <template v-slot:right_button v-if="activateAdvancedOutboundMode && step !== '2'">
      <v-btn 
        color="primary" 
        flat 
        @click.stop="() => {
          step = `${parseInt(step) + 1}`
          clearData()
        }"
      >Next</v-btn>
    </template>
  </FormSubmitPopup>
</template>

<script>
import FormSubmitPopup from './FormSubmitPopup'
import { checkRules, stringTools, mediaTools, deepEqual } from '@/utils/tools'
import UploadFileWidget from './UploadFileWidget'
import BarcodeFinder from '../utils/barcode'

export default {
  name: 'ConfirmShipmentPopup',
  components: {
    FormSubmitPopup,
    UploadFileWidget
  },
  mixins: [
    checkRules, 
    stringTools,
    mediaTools
  ],
  data () {
    return {
      step: 0,
      allServices: [
        'expedite',
        'label',
        'photo',
        'SN'
      ],
      panel: [true],
      rightBtnDisabled: false,
      shipmentServices: [],
      shipmentServiceSet: new Set(),
      complimentaryServices: [],
      selectedRequiredServices: [],
      selectedComplimentServices: [],
      hasExtraFee: false,
      extraFee: 0,
      note: '',
      snRecords: [],
      attachments: [],
      removeFilesUponUnmounted: false,
      upcMap: {},
      scannedItemMap: {},
      soundToggle: false,
      soundPitch: 1,
      barcode: '',
      errorMessage: '',
      errorAlert: false,
      trackings: [],
      upcInEdit: ''
    }
  },
  created () {
    this.initComponent()
    this.selectedRequiredServices = [...this.shipmentServices]
    this.soundToggle = window.localStorage.getItem('inbound.soundToggle')
    this.soundToggle = (this.soundToggle !== undefined && this.soundToggle === 'true') || false
    this.soundPitch = Number(window.localStorage.getItem('inbound.soundPitch') || 1)
  },
  mounted () {
    this.focusOnTextBox()
  },
  computed: {
    isWarehouse () {
      return !!this.$store.getters.activeWarehouse
    },
    selectedAllServices () {
      return [
        ...this.selectedRequiredServices,
        ...this.selectedComplimentServices
      ]
    },
    activateAdvancedOutboundMode () {
      return this.$store.getters.activateAdvancedOutboundMode
    },
    upcToProductMap () {
      return this.$store.getters.upcMap
    },
    uploadedTrackings () {
      return this.$store.getters.uploadedTrackings
    }
  },
  methods: {
    initComponent () {
      const {isExpedited, otherServices, products = []} = this.shipment
      this.shipmentServices = [...otherServices].sort()
      isExpedited && this.shipmentServices.unshift('expedite')
      this.shipmentServiceSet = new Set(this.shipmentServices)
      this.complimentaryServices = this.allServices.filter(item => !this.shipmentServiceSet.has(item))
      products.forEach(product => {
        const {upc, toShip} = product
        this.$set(this.upcMap, upc, toShip)
        this.$set(this.scannedItemMap, upc, 0)
      })
    },
    extraServiceRecords () {
      let records = {}
      if (this.snRecords.length) {
        records.snRecords = this.snRecords
      }
      if (this.attachments.length) {
        records.attachments = this.attachments
      }
      return records
    },
    async onSubmitted () {
      if (!deepEqual(this.shipmentServices, this.selectedRequiredServices)) {
        if (!confirm(`Some requested services are not checked. Are you sure to continue?`)) return 'keepPopup'
      }

      if (this.activateAdvancedOutboundMode && !deepEqual(this.upcMap, this.scannedItemMap)) {
        throw Error(`Scanned items do not match shipment items`)
      }

      if (this.activateAdvancedOutboundMode && this.trackings.some(tracking => this.uploadedTrackings.has(tracking))) {
        throw Error(`Scanned tracking has duplicate, please check`)
      }
      
      if (this.selectedRequiredServices.includes('SN') && this.snRecords.length === 0) {
        throw Error(`SN number missing, please check.`)
      }

      if (this.selectedRequiredServices.includes('photo') && this.attachments.length === 0) {
        throw Error(`Photo missing, please check.`)
      }

      const {
        shipment, 
        note: warehouseNote, 
        selectedAllServices, 
        extraFee, 
        attachments, 
        snRecords,
        scannedItemMap,
        trackings: uploadedTrackings
      } = this

      this.removeFilesUponUnmounted = false
      return this.$store.dispatch('confirmShipment', {
        ...shipment.getData(), 
        shipmentKey: shipment.getKey(),
        warehouseNote,
        confirmedOtherServices: this.hasExtraFee ? [...selectedAllServices, 'extra'] : selectedAllServices,
        extraFee,
        attachments,
        snRecords,
        scannedItems: this.activateAdvancedOutboundMode ? 
          Object.entries(scannedItemMap).map(([upc, quantity]) => {
            return {upc, quantity, requiredQuantity: this.upcMap[upc]}
          }) :
          null,
        uploadedTrackings
      })
        .then(() => {
          this.attachments = []
        })
        .catch(err => {
          this.removeFilesUponUnmounted = true
          this.error = err.message
          throw err
        })
    },
    onServiceChange (event, service) {
      if (service === 'photo') {
        this.attachments = []
      } else if (service === 'SN') {
        this.snRecords = []
      } 
    },
    addBarcode (event) {
      if (!this.barcode) return
      event && event.target.select()
      this.barcode = this.trimNonwordChar(this.barcode)
      if (this.upcMap[this.barcode] === undefined) {
        this.addTracking()
      } else {
        this.addUpc()
      }
      this.playSound('success')
    },
    playSound (type) {
      if (!this.soundToggle) return
      if (type === 'hint') return this.hintSound(this.soundPitch)()
      if (type === 'success') return this.successSound(this.soundPitch)()
      if (type === 'warning') return this.warningSound(this.soundPitch)()
      return this.closeSound()
    },
    addUpc () {
      if (this.upcMap[this.barcode] === undefined) {
        this.playSound('warning')
        this.errorAlert = true
        this.errorMessage = 'invalid UPC'
        return
      }
      this.$set(this.scannedItemMap, this.barcode, this.scannedItemMap[this.barcode] || 0)
      this.$set(this.scannedItemMap, this.barcode, this.scannedItemMap[this.barcode] + 1)
      this.$set(this.upcMap, this.barcode, this.upcMap[this.barcode] || 0)
      this.clearData()
    },
    clearData () {
      this.barcode = ''
      this.errorAlert = false
      this.errorMessage = ''
    },
    addTracking () {
      const barcode = this.barcode.toUpperCase()
      if (!BarcodeFinder.isTrackingNumberValid(this.barcode)) {
        this.playSound('warning')
        this.errorAlert = true
        this.errorMessage = 'Invalid tracking'
        return
      }
      if (this.trackings.includes(barcode) || this.uploadedTrackings.has(barcode)) {
        this.playSound('warning')
        this.errorAlert = true
        this.errorMessage = 'Duplicate Tracking number'
        return
      }
      this.trackings.push(barcode)
      this.clearData()
    },
    quantityChanged (event, item) {
      this.scannedItemMap[item[0]] = parseInt(event) || 0
    },
    isUpcFulfilled (upc) {
      return this.upcMap[upc] === this.scannedItemMap[upc]
    },
    focusOnTextBox () {
      if (!this.activateAdvancedOutboundMode) return
      setTimeout(() => {
        document.getElementById('inputBox').focus()
      }, 300)
    },
    removeChip (item) {
      this.trackings.splice(this.trackings.indexOf(item), 1)
      this.trackings = [...this.trackings]
    }
  },
  props: {
    value: Boolean,
    shipment: Object
  }
}
</script>

<style>
.fulfillment_list {
  background-color : yellow
}

.fontRed {
  color: red;
}
</style>
