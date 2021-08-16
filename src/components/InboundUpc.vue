<template>
  <v-container fluid>
    <v-layout>
      <v-flex>
        <v-card>
          <v-snackbar
            :timeout="30000"
            :top="true"
            :color="toastColor"
            v-model="toastEnable"
          >
            {{ toastText }}
            <v-btn dark flat @click.stop="toastEnable = false">Close</v-btn>
          </v-snackbar>
        </v-card>
        <v-layout align-center>
          <v-flex xs6 sm4 md2>
            <v-autocomplete
              :items="warehousesSites"
              item-text="siteName"
              item-key="key"
              return-object
              v-model="currentWarehouseSite"
              label="Warehouse site"
              clearable
            ></v-autocomplete>
          </v-flex>
          <v-spacer></v-spacer>
          <v-btn dark large color="blue" title="Organization" style="font-size: 30px!important;" v-if="organizationKey">
            {{(organizations.find(item => item.key === organizationKey) || {}).organizationId}}
          </v-btn>
          <v-spacer></v-spacer>
          <v-flex xs6 sm4 md2>
            <v-switch
              :label="label"
              v-model="isTrackingMode"
            ></v-switch>
          </v-flex>
          <slot></slot>
          <v-checkbox
            v-if="isEnableSnScan && isTrackingMode"
            dismissible
            v-model="isEnableSnFlag"
            outline
            label="Scan SN"
            type="info"></v-checkbox>
          <v-flex sm6 md3 lg3 xl2>
            <v-layout>
              <v-switch
                label="Sound"
                v-model="soundToggle"
                @change="setSoundToggle"
              ></v-switch>
              <v-flex xs6>
                <v-select
                  v-if="soundToggle"
                  v-model="soundPitch"
                  @change="setSoundPitch"
                  :items="[
                    {name: 'Pitch 1', value: 1},
                    {name: 'Pitch 2', value: 2}
                  ]"
                  item-text="name"
                  item-value="value"></v-select>
              </v-flex>
            </v-layout>
          </v-flex>
        </v-layout>
        <v-card color="grey lighten-4" flat>
          <v-card-text>
            <v-container fluid>
              <v-layout row wrap>
                <v-flex xs8 md3 dense light :class="isTrackingMode? 'warning' : ''">
                  <v-list v-if="(cache.trackings.length === 0 && isTrackingMode) || (Object.keys(productCache).length === 0 && !isTrackingMode)" :class="isTrackingMode? 'warning' : ''">
                    <v-list-tile>
                      <v-list-tile-title class="body-2">{{scanText}}</v-list-tile-title>
                    </v-list-tile>
                  </v-list>
                  <v-list dense v-else-if="isTrackingMode" class="warning">
                    <v-list-tile v-for="(tracking) in cache.trackings" v-bind:key="tracking.tracking">
                      <v-list-tile-content>
                        <v-list-tile-title class="body-2">{{ tracking.tracking }} ({{ items.reduce((acc, item) => acc + (item.trackings[0].tracking === tracking.tracking ? item.quantity : 0), 0) }})</v-list-tile-title>
                        <v-list-tile-sub-title class="body-2">{{detectCarrier(tracking.barcode[tracking.barcode.length - 1]).join(", ")}}</v-list-tile-sub-title>
                      </v-list-tile-content>
                    </v-list-tile>
                  </v-list>
                  <v-list dense class="denseList" v-else>
                    <v-list-tile v-for="key in Object.keys(productCache)" v-bind:key="key" >
                      <v-list-tile-title class="body-2"><v-layout justify-space-around>{{ displayProductCacheKeyWithFlag(key) }}<v-avatar size="20" class="blue"><span class="white--text body-2">{{productCache[key].quantity}}</span></v-avatar></v-layout></v-list-tile-title>
                    </v-list-tile>
                  </v-list>
                </v-flex>
                <v-flex xs4 md1>
                  <v-btn dark color="primary" v-if="cache.trackings.length > 0 && cache.trackings.length < 2 && isTrackingMode" @click.stop="showAddTrackingDialog"><v-icon>add</v-icon>tracking</v-btn>
                  <SimpleTextPopup
                    v-model="addTrackingdialog"
                    :title="'Add tracking'"
                    :label="'Input tracking number here'"
                    @popupClose="addTrackingdialog = false"
                    :rightMethod="addAnotherTracking"
                    ref="trackingPopup"></SimpleTextPopup>
                  <v-btn dark color="primary" v-if="Object.keys(productCache).length > 0 && !isTrackingMode" @click.stop="productCache = {}"><v-icon>clear</v-icon>Reset</v-btn>
                </v-flex>
                <v-spacer></v-spacer>
                <v-flex xs12 md3>
                  <v-text-field
                    :label="'Input barcode here' + (forceMode ? `(force ${forceMode} mode)` : '')"
                    id="barcode"
                    title="Alt+t to add as tracking; Alt+u to add as UPC"
                    hint="Alt+t / [*] to add as tracking; Alt+u / {*} to add as UPC"
                    v-model="barcode"
                    @keyup.enter="addBarcode"
                    @keyup.alt.84="forceAddTracking"
                    @keyup.alt.85="forceAddUpc"
                    ref="barcodeBox"
                    autofocus
                    :disabled="isDisabled || isUploading"
                    :outline="!!forceMode"
                  ></v-text-field>
                  <SimpleTextPopup
                    v-model="pickBarcodedialog"
                    :title="'Is this UPC or Tracking number'"
                    @popupClose="pickBarcodedialog = false"
                    :leftButtonText="'Tracking number'"
                    :rightButtonText="'UPC'"
                    :rightMethod="addUpc"
                    :leftMethod="addTracking"></SimpleTextPopup>
                </v-flex>
                <v-spacer></v-spacer>
                <v-flex xs12 md2>
                  <v-autocomplete
                    :items="organizations"
                    item-text="organizationId"
                    item-value="key"
                    v-model="organizationKey"
                    label="Organization ID"
                    clearable
                  ></v-autocomplete>
                </v-flex>
              </v-layout>
            </v-container>
          </v-card-text>
        </v-card>
        <v-layout row>
          <v-flex xs6 md3>
            <v-text-field
              append-icon="filter_list"
              label="Filter"
              single-line
              hide-details
              v-model.trim="filter"
              @keyup.enter="filterEnter"
              clearable
            ></v-text-field>
          </v-flex>
          <v-flex xs1></v-flex>
          <v-flex md4 class="font-weight-medium text-end" style="position: relative; top: 20px;">
            packages/units/upcs: {{filteredPkgQty}}/{{filteredItemQty}}/{{filteredUpcQty}}
          </v-flex>
          <v-flex md2>
            <v-alert
              border="right"
              outline
              type="error"
              :value="!isItemsAllSized || isTypeMixed"
              elevation="2"
            >
              {{this.isTypeMixed ? 'Cannot upload custom size with other size type' : 'Package size missing'}}
            </v-alert>
          </v-flex>
          <v-flex xs12 sm6 class="text-xs-center text-sm-right">
            <v-layout justify-space-between>
              <v-flex xs3>
                <LoaderButton
                  v-model="isUploading"
                  :buttonText="`Upload`"
                  :promiseAwait="uploadItems"
                  :disabled="isUploadBtnDisabled"
                  >
                    <template v-slot:icon>
                      <v-icon dark left>cloud_upload</v-icon>
                    </template>
                </LoaderButton>
              </v-flex>
              <v-flex xs3 md4>
                <v-menu offset-y style="display: inline-block;">
                  <template v-slot:activator="data">
                    <v-btn color="primary" v-on="data.on" :disabled="loading"><v-icon dark left>filter_none</v-icon>Copy</v-btn>
                  </template>
                  <v-list dark class="primary">
                    <v-list-tile @click="copyTextToClipboard">
                      <v-list-tile-title>copy</v-list-tile-title>
                    </v-list-tile>
                    <v-list-tile @click="copyTextToClipboard($event, '\t')">
                      <v-list-tile-title>copy for sheet</v-list-tile-title>
                    </v-list-tile>
                  </v-list>
                </v-menu>
              </v-flex>
              <v-flex xs3 md4 v-if="$vuetify.breakpoint.lgAndUp">
                <v-btn color="primary" class="upload-file" title="import packages" :loading="importing" :disabled="!this.isTrackingMode || importing || loading || isDisabled">
                  <v-icon dark left>trending_flat</v-icon>
                  Import
                  <input type="file" :multiple="false" :accept="['*'].join(',')" v-on:click="clearSelectionCache" v-on:change="fileSelected" />
                </v-btn>
              </v-flex>
              <v-flex xs3 md4>
                <v-btn dark color="red" @click="deleteAllData" :disabled="importing || loading" >
                  <v-icon dark left>delete</v-icon>
                  Clear
                </v-btn>
              </v-flex>
            </v-layout>
          </v-flex>
        </v-layout>
        <v-layout column>
          <v-data-table
            :headers="headers"
            :items="items"
            class="elevation-2 myDense"
            :search="filter"
            ref="packagesTable"
            :pagination.sync="pagination"
            :rowsPerPageItems="rowsPerPageItems"
          >
            <template v-slot:headerCell="props">
              {{ props.header.text }}
              <template v-if="props.header.text.toLowerCase() === 'quantity'">
                ({{totalOfFilteredItems}})
              </template>
            </template>
            <template v-slot:items="props">
              <tr :class="(isItemTrackingInCache(props.item) && !props.item.isUploaded) && !isUploading ? 'item-with-dup-tracking' : ''">
                <td class="subheading">
                  <v-layout align-baseline>
                    <v-flex>{{ props.index  + 1}}</v-flex>
                    <v-flex class="text-xs-center">
                      <v-layout align-baseline>
                        <v-flex><v-icon left color="primary" v-if="props.item.isUploaded">cloud_upload</v-icon></v-flex>
                        <v-flex>
                          <v-icon left color="red" v-if="props.item.isAbnormal">flag</v-icon>
                          <v-icon left color="warning" v-else-if="props.item.note || (props.item.attachments && props.item.attachments.length)">comment</v-icon>
                        </v-flex>
                      </v-layout>
                    </v-flex>
                  </v-layout>
                </td>
                <td class="text-xs-left">
                  <v-tooltip top>
                    <template v-slot:activator="data">
                      <span v-on="data.on">{{ props.item.trackings.map(item => item.tracking).join(", ") }}</span>
                    </template>
                    <span>{{ props.item.trackings.map(item => item.barcode).join(", ") }}</span>
                  </v-tooltip>
                </td>
                <td class="text-xs-left">
                  <v-layout>
                    <v-flex>
                      <div @click="showSnEditDialog(props.item)" v-if="isEnableSnMode">
                        <v-layout>{{ getProductIdWithFlag(props.item) }}{{ props.item.sku && (' / ' + props.item.sku) }}</v-layout>
                        <v-layout style="max-width: 300px; overflow-wrap: break-word; word-break: normal;" wrap v-if="props.item.snArray && props.item.snArray.length">{{ props.item.snArray && props.item.snArray.length && (`(${props.item.snArray.join(', ')})`) }}</v-layout>
                      </div>
                      <div v-else>
                        <v-layout>{{ getProductIdWithFlag(props.item) }}{{ props.item.sku && (' / ' + props.item.sku) }}</v-layout>
                        <v-layout style="max-width: 300px; overflow-wrap: break-word; word-break: normal;" wrap v-if="props.item.snArray && props.item.snArray.length">{{ props.item.snArray && props.item.snArray.length && (`(${props.item.snArray.join(', ')})`) }}</v-layout>
                      </div>
                    </v-flex>
                    <v-flex xs1>
                      <v-icon v-if="props.item === itemInEdit && isEnableSnMode">pin</v-icon>
                    </v-flex>
                  </v-layout>
                </td>
                
                <td class="text-xs-left">{{upcMap[props.item.upc] ? upcMap[props.item.upc].description : 'new product'}}</td>
                <td class="text-xs-left">
                  <template v-if="props.item.size || props.item.size === 0">{{ sortKeyToSize.get(props.item.size) }}</template>
                  <template v-else>
                    <v-layout justify-start>
                      <v-btn fab dark color="blue" @click="showAddSizeDialog(props.item)" title="Add UPC" style="width: 25px; height: 25px; margin: 0px;">
                        <v-icon dark>add</v-icon>
                      </v-btn>
                    </v-layout>
                  </template>
                </td>
                <td class="text-xs-left">
                  <v-edit-dialog
                    :return-value.sync="props.item.organizationKey"
                    large
                    lazy
                    persistent
                    v-if="mode === 'upc'"
                  >
                    <div>{{ (props.item.organizationKey && findOrganizationId(props.item.organizationKey)) || "-----" }}</div>
                    <template v-slot:input>
                      <v-autocomplete
                        :items="organizations"
                        item-text="organizationId"
                        item-value="key"
                        v-model="props.item.organizationKey"
                        label="Select organization Id"
                        clearable
                        @change="organizationChanged($event, props.item)"
                      ></v-autocomplete>
                    </template>
                  </v-edit-dialog>
                  <div v-else>{{ (props.item.organizationKey && findOrganizationId(props.item.organizationKey)) || "-----" }}</div>
                </td>
                <td class="text-xs-left">
                  <v-edit-dialog
                    :return-value="props.item.quantity"
                    v-on:update:returnValue="quantityChanged($event, props.item)"
                    large
                    lazy
                    persistent
                  > <div>{{ props.item.quantity }}</div>
                    <template v-slot:input>
                      <div class="mt-3">Update quantity</div>
                      <v-text-field
                        label="Edit"
                        v-model.number="props.item.quantity"
                        single-line
                        autofocus
                        mask="#######"
                      ></v-text-field>
                    </template>
                  </v-edit-dialog>
                </td>
                <td class="text-xs-center">
                  <v-layout row>
                    <v-flex><v-btn small :disabled="!!props.item.isUploaded" color="primary" icon flat @click.stop="showAddNote(props.item.trackings, props.item.upc)"><v-icon dark>note</v-icon></v-btn></v-flex>
                    <v-flex><v-btn small color="red" icon flat @click.stop="deleteData(props.item)"><v-icon dark>cancel</v-icon></v-btn></v-flex>
                  </v-layout>
                </td>
              </tr>
            </template>
          </v-data-table>
        </v-layout>
        <FormSubmitPopup
          v-model="addNotedialog"
          @popupClose="(btnIndex) => { !btnIndex && ++removeFiles; addNotedialog = false }"
          :title="'Add note'"
          :rightMethod="addNote"
          medium>
          <template v-slot:input>
            <!-- input text box & checkbox of abnormal & abnormal number -->
            <v-container>
              <v-layout row wrap>
                <v-flex xs6 sm4>
                  <v-checkbox label="Abnormal" v-model="notecache.isAbnormal"></v-checkbox>
                </v-flex>
                <v-flex xs6 sm6>
                  <v-text-field
                    v-if="notecache.isAbnormal"
                    name="abnormalQty"
                    label="Abnormal quantity"
                    id="abnormalQty"
                    v-model.number="notecache.abnormalQty"
                    :rules="[fieldIsInteger('Abnormal Quantity'), fieldIsNoLessThanZero('Abnormal Quantity'), abnormalQtyLeItemQty]"
                  ></v-text-field>
                </v-flex>

                <v-flex xs12>
                  <v-autocomplete
                    v-if="notecache.isAbnormal"
                    label="Note template"
                    @change="setNoteTemplate"
                    :items="noteTemplate"
                  ></v-autocomplete>
                  <v-textarea
                    id="package_note"
                    label="Note"
                    outline
                    v-model="notecache.note"
                  ></v-textarea>
                </v-flex>
                <v-flex xs12 v-if="(notecache.attachments || []).length">
                  <b>Uploaded files: </b>
                  <v-chip 
                    dark color="info" close
                    v-for="(file, index) in notecache.attachments"
                    :key="file.name + index"
                    @input="v => !v && removeUploadFile(file)"
                  >{{file.name}}</v-chip>
                </v-flex>
                <v-flex xs12>
                  <UploadFileWidget
                    v-model="attachments"
                    :maxFiles="3 - (notecache.attachments || []).length"
                    type="packages"
                    :clearFiles="clearFiles"
                    :removeFiles="removeFiles"
                  />
                </v-flex>
              </v-layout>
            </v-container>
          </template>
        </FormSubmitPopup>
        <SnArrayEditPopup
          v-model="snEditDialog"
          v-if="snEditDialog"
          :snArray="itemInEdit.snArray"
          @submitted="snChanged"/>
        <InboundAddUpcPopup
          v-model="addUpcDialog"
          v-if="addUpcDialog"
          :package="packageInEdit"
          @submitted="updateItemUpcInfo"/>
      </v-flex>
    </v-layout>
  </v-container>
</template>

<script>
import BarcodeFinder from '../utils/barcode'
import FormSubmitPopup from './FormSubmitPopup'
import {copyToClipboard, mediaTools} from '../utils/tools'
import SimpleTextPopup from './SimpleTextPopup'
import LoaderButton from './LoaderButton'
import UploadFileWidget from './UploadFileWidget'
import { checkRules, deepEqual, getRandomIdByTime, warehouseTools, stringTools } from '@/utils/tools'
import xlsx from 'xlsx'
import InboundAddUpcPopup from './InboundAddUpcPopup'
import SnArrayEditPopup from './SnArrayEditPopup'

export default {
  name: 'inboundUpc',
  components: {
    FormSubmitPopup,
    SimpleTextPopup,
    LoaderButton,
    UploadFileWidget,
    InboundAddUpcPopup,
    SnArrayEditPopup
  },
  mixins: [mediaTools, checkRules, warehouseTools, stringTools],
  data () {
    return {
      mode: 'upc',
      toastEnable: false,
      toastText: 'invalid UPC',
      toastColor: 'error',
      addTrackingdialog: false,
      addNotedialog: false,
      addUpcDialog: false,
      pickBarcodedialog: false,
      isDisabled: false,
      isUploading: false,
      filter: '',
      filteredItems: [],
      currentWarehouseSite: {},
      // {trackings: [{tracking, barcode}], upc}
      items: [],
      cache: {
        trackings: []
      },
      // {upc: {quantity, flag}}*
      productCache: {},
      barcode: '',
      notecache: {
        attachments: [],
        trackings: [],
        upc: '',
        note: '',
        isAbnormal: false,
        abnormalQty: 0
      },
      organizationKey: '',
      isTrackingMode: true,
      importing: false,
      pagination: {
        sortBy: '',
        rowsPerPage: 25
      },
      rowsPerPageItems: [25, 50, 100, {text: 'All', value: -1}],
      soundToggle: true,
      soundPitch: 1,
      inputLock: false,
      orgIdBarcodePrefix: '*#*#-',
      queryLimit: undefined,
      uploadRequestId: '',
      attachments: [],
      clearFiles: 0,
      removeFiles: 0,
      soundSettings: {
        success: () => {},
        hint: () => {},
        warning: () => {},
        tracking: () => {},
        upc: () => {}
      },
      packageInEdit: {},
      addSkuDialog: false,
      forceMode: '',
      itemInEdit: null,
      snEditDialog: false,
      isEnableSnFlag: false
    }
  },
  mounted () {
    // caculate the filtered items
    this.$watch(() => this.$refs.packagesTable.filteredItems, (newValue, oldValue) => { this.filteredItems = newValue })
    this.loadDataFromStorage()

    this.uploadRequestId = window.localStorage.getItem('uploadId' + this.uid)
    this.soundToggle = window.localStorage.getItem('inbound.soundToggle')
    this.soundToggle = (this.soundToggle !== undefined && this.soundToggle === 'true') || false
    this.soundPitch = Number(window.localStorage.getItem('inbound.soundPitch') || 1)
    this.loadGeneralSettings()
    this.onSoundPitchChanged()
  },
  computed: {
    isTypeMixed () {
      return (new Set(this.items.map(item => item.size === 'custom'))).size > 1
    },
    isItemsAllSized () {
      return !this.items.some(item => !item.size && item.size !== 0)
    },
    label () {
      if (this.isTrackingMode) return 'Tracking number'
      return 'UPC'
    },
    user () {
      return this.$store.getters.user
    },
    uid () {
      return this.$store.getters.uid
    },
    upcMap () {
      return this.$store.getters.upcMap
    },
    warehousesSites () {
      return this.$store.getters.warehousesSites
    },
    loading () {
      return this.$store.getters.loading
    },
    organizations () {
      return this.$store.getters.warehouseOrganizations.filter(element => {
        return element.organizationId !== ''
      })
    },
    totalOfFilteredItems () {
      return this.filteredItems.reduce((accu, item, index) => { return item ? (accu + 1 * item.quantity) : accu }, 0)
    },
    filteredPkgQty () {
      let trackings = this.items
        .filter(item => this.isItemMatchFilter(item))
        .map(item => item.trackings[0].tracking)
      return new Set(trackings).size
    },
    filteredItemQty () {
      return this.items.reduce((acc, item) => {
        if (this.isItemMatchFilter(item)) {
          return acc + 1 * item.quantity
        } else {
          return acc
        }
      }, 0)
    },
    filteredUpcQty () {
      return new Set(this.items
        .filter(item => this.isItemMatchFilter(item))
        .map(item => item.upc)).size
    },
    upcSizes () {
      return this.$store.getters.upcSizes
    },
    sortKeyToSize () {
      return new Map([
        ...this.upcSizes.map(item => [item.sortKey, item.name]),
        ...this.upcSizes.map(item => [item.name, item.name])
      ])
    },
    noteTemplate () {
      const {quantity, upc, isAbnormal, abnormalQty} = this.notecache
      return isAbnormal ? [
        {text: 'None', value: ''},
        {text: 'Abnormal template', value: `UPC: ${upc}, total Qty: ${quantity}, normal Qty: ${quantity - abnormalQty}, abnormal Qty: ${abnormalQty}`}
      ] : []
    },
    scanText () {
      if (this.isTrackingMode) return 'Scan a tracking number'
      return 'Scan a UPC number'
    },
    headers () {
      return [
        { text: 'Index', align: 'left', sortable: false, value: 'index', width: '8%' },
        { text: 'Tracking number', value: 'keywordString', align: 'left', sortable: false },
        { text: 'UPC/SKU(SN)', value: 'upc', align: 'left', sortable: false },
        { text: 'Description', value: 'desc', align: 'left', sortable: false },
        { text: 'Size', value: 'size', align: 'left', sortable: true },
        { text: 'Org ID', value: 'organizationId', align: 'left', sortable: false },
        { text: 'Quantity', value: 'quantity', align: 'left', sortable: false },
        { text: 'Actions', value: 'sku', align: 'middle', sortable: false }
      ]
    },
    isUploadBtnDisabled () {
      return this.importing || this.isDisabled || !this.isItemsAllSized || this.isTypeMixed
    },
    organizationKeyToId () {
      return this.$store.getters.organizationKeyToId
    },
    trackingCacheSet () {
      return new Set(this.$store.getters.inboundTrackingCache)
    },
    generalSettings () {
      return this.$store.getters.warehouseInfo.generalSettings || {}
    },
    isEnableSnScan () {
      return this.generalSettings.enableSnScan
    },
    isEnableSnMode () {
      return this.isEnableSnScan && this.isTrackingMode && this.isEnableSnFlag
    }
  },
  watch: {
    user (value) {
      if (value === null || value === undefined) {
        this.$router.push('/signin')
      }
    },
    snEditDialog (value) {
      if (!value) {
        this.itemInEdit = null
      }
    },
    isEnableSnMode () {
      this.itemInEdit = null
    }
  },
  methods: {
    loadGeneralSettings () {
      this.currentWarehouseSite = this.warehousesSites.find(item => item.key === this.generalSettings.defaultSite)
      this.organizationKey = this.generalSettings.defaultOrgId
    },
    isItemMatchFilter (item) {
      return !this.filter || 
        item.keywordString.includes(this.filter) ||
        item.upc.includes(this.filter) || 
        (item.sku && item.sku.includes(this.filter))
    },
    loadDataFromStorage () {
      let previousData = window.localStorage.getItem('items' + this.uid)
      let previousFlag = window.localStorage.getItem('flag' + this.uid)
      if (previousData) {
        try {
          this.items = JSON.parse(previousData).map(item => {
            const {upc, sku} = item
            item.size = upc ? this.getSizeFromUpc(upc) : this.getSizeFromSku(sku)
            return item
          })
          this.$emit('input', this.items)
          this.itemInEdit = this.items.find(item => item.isEditing)
          this.isDisabled = JSON.parse(previousFlag)
        } catch (error) {
          console.log('error getting local storage: ' + error)
          this.items = []
        }
      }
    },
    getSizeFromSku (sku) {
      if (this.skuToUpcMap[sku]) {
        return this.upcMap[this.skuToUpcMap[sku]].size
      }
      return null
    },
    getSizeFromUpc (upc) {
      return this.upcMap[upc] && this.upcMap[upc].size
    },
    showAddSizeDialog (item) {
      this.queryLimit = undefined
      this.packageInEdit = item
      this.addUpcDialog = true
    },
    filterEnter (event) {
      event.target.select()
      this.playSound('hint')
    },
    setSoundToggle (value) {
      localStorage.setItem('inbound.soundToggle', value)
      this.onSoundPitchChanged(value)
    },
    setSoundPitch (value) {
      localStorage.setItem('inbound.soundPitch', value)
      this.onSoundPitchChanged()
    },
    onSoundPitchChanged (value = true) {
      this.soundSettings.hint = value ? this.hintSound(this.soundPitch) : () => {}
      this.soundSettings.success = value ? this.successSound(this.soundPitch) : () => {}
      this.soundSettings.warning = value ? this.warningSound(this.soundPitch) : () => {}
      this.soundSettings.upc = value ? this.upcSound(this.soundPitch) : () => {}
      this.soundSettings.tracking = value ? this.trackingSound(this.soundPitch) : () => {}
      return value || this.closeSound()
    },
    playSound (type = 'hint') {
      if (this.soundToggle) this.soundSettings[type]()
    },
    detectCarrier (barcode) {
      let carriers = this.guessCarrier(barcode).map(item => item.name)
      if (carriers.length === 0) carriers = ['unknown carrier']
      return carriers
    },
    detectOrgId (value) {
      if (value && value.startsWith(this.orgIdBarcodePrefix)) {
        return value.substring(this.orgIdBarcodePrefix.length)
      } else {
        return null
      }
    },
    addSn () {
      if (BarcodeFinder.isUpcValid(this.barcode) || this.guessCarrier(this.barcode).length > 0) {
        this.showToast('Please scan an SN.')
        return
      }

      this.itemInEdit.snArray = this.itemInEdit.snArray || []
      this.itemInEdit.snArray.push(this.barcode.trim().toUpperCase())
      this.$set(this.itemInEdit, 'snArray', this.itemInEdit.snArray)
      this.itemInEdit.keywordString = this.itemInEdit.trackings.map(item => item.barcode.join(',')).join(',') + this.itemInEdit.snArray.join(',')

      delete this.itemInEdit.isEditing
      this.itemInEdit = null
      this.barcode = ''
      this.updateItems(this.items)
      this.playSound('success')
    },
    addBarcode (event) {
      if (!this.importing && this.inputLock) {
        event && event.target.select()
        return
      }

      if (!this.importing) {
        this.inputLock = true
        setTimeout(() => { this.inputLock = false }, 100)
      }

      if (this.handleSpecialBarcode()) return
      // if (BarcodeFinder.isUpcValid(this.barcode) && carrierMaybe.length > 0) {
      //   this.pickBarcodedialog = true
      //   return
      // }

      if (this.forceMode === 'tracking') {
        this.forceAddTracking()
        return
      }

      if (this.forceMode === 'upc') {
        this.forceAddUpc()
        return
      }

      if (this.isEnableSnMode && this.itemInEdit) {
        this.addSn()
        return
      }

      // detect org id first
      let orgId = this.detectOrgId(this.barcode.trim())
      if (orgId) {
        this.pickOrgId(orgId)
      } else {
        this.barcode = this.trimNonwordChar(this.barcode)
        if (BarcodeFinder.isUpcValid(this.barcode)) {
          this.addUpc(event)
        } else {
          let carrierMaybe = this.guessCarrier(this.barcode)
          if (carrierMaybe.length > 0) {
            this.addTracking(carrierMaybe)
          } else {
            this.showToast('invalid tracking number or UPC', 'error', event)
          }
        }        
      }
    },
    pickOrgId (orgId) {
      this.barcode = ''
      let selectedOrg = this.organizations.find(item => item.organizationId.toUpperCase() === orgId.toUpperCase())
      if (selectedOrg) {
        this.organizationKey = selectedOrg.key
      } else {
        this.showToast('Invalid organization', 'error')
      }
      this.playSound('success')
    },
    addUpc (event) {
      let canbeTracking = (this.guessCarrier(this.barcode).length > 0)

      if (this.isTrackingMode) {
        if (this.cache.trackings.length > 0) {
          this.addToStage(this.cache.trackings.slice(0), this.barcode, {quantity: 1, flag: canbeTracking})
        } else {
          this.showToast('Please scan a valid tracking number first', 'error', event)
        }
      } else {
        let {quantity, flag} = this.productCache[this.barcode] ? this.productCache[this.barcode] : {quantity: 0, flag: canbeTracking}
        quantity++
        this.productCache[this.barcode] = {quantity, flag}
        // this.productCache = this.barcode
        this.barcode = ''
      }
      this.playSound('upc')
    },
    addTracking (carrier) {
      let firstCarrierTracking = carrier[0].tracking
      if (this.isTrackingMode) {
        let tracking = firstCarrierTracking[0]
        let barcode = [...new Set([...firstCarrierTracking, this.barcode])]
        this.cache.trackings = [{tracking, barcode}]
        this.barcode = ''
      } else {
        if (Object.keys(this.productCache).length > 0) {
          let tracking = firstCarrierTracking[0]
          let barcode = [...new Set([...firstCarrierTracking, this.barcode])]
          Object.keys(this.productCache).forEach(key => {
            this.addToStage([{tracking, barcode}], key, this.productCache[key])
          })
        } else {
          this.barcode = ''
          this.showToast('Please scan a valid UPC number first', 'error')
        }
      }
      this.playSound('tracking')
    },
    addAnotherTracking (barcode) {
      barcode = this.trimNonwordChar(barcode)
      if (barcode) {
        let carrier = this.guessCarrier(barcode)
        let firstCarrierTracking = carrier[0].tracking
        let tracking = firstCarrierTracking[0]
        if (carrier.length > 0) {
          this.cache.trackings.push({tracking, barcode: [...new Set([...firstCarrierTracking, barcode])]})
          this.playSound('success')
        } else {
          this.showToast('The tracking number is invalid')
        }
      }
      this.addTrackingdialog = false
    },
    forceAddTracking () {
      this.barcode = this.trimNonwordChar(this.barcode)
      if (!this.barcode.length) this.showToast('Please scan a valid tracking number first')
      this.addTracking([{tracking: [this.barcode.toUpperCase()]}])
      this.playSound('success')
    },
    forceAddUpc () {
      this.barcode = this.trimNonwordChar(this.barcode)
      if (!this.barcode.length) this.showToast('Please scan a valid UPC number first')
      this.addUpc()
      this.playSound('success')
    },
    showAddTrackingDialog () {
      this.addTrackingdialog = true
    },
    addToStage (trackings, barcode, extra) {
      if (trackings.length > 0 && barcode) {
        const newItem = {
          trackings: trackings,
          quantity: extra && extra.quantity ? extra.quantity : 1,
          organizationKey: this.organizationKey || '',
          flag: extra && extra.flag ? extra.flag : false,
          upc: barcode,
          size: this.upcMap[barcode] && this.upcMap[barcode].size,
          keywordString: trackings.map(item => item.barcode.join(',')).join(','),
          snArray: []
        }
        this.addToItems(newItem)
        this.barcode = ''
      }
    },
    addToItems (newItem) {
      const {tracking} = newItem.trackings[0]
      const isDup = this.items.some(item => 
        (item.trackings[0].tracking === tracking) && 
        item.organizationKey !== newItem.organizationKey)

      // same tracking should not be assigned to 2 different orgs
      if (isDup) {
        this.playSound('warning')
        return alert('Tracking assigned to different organizations, please check.')
      }

      // float the existed item to the top of the data-table
      let index = this.findItemIndex(newItem)
      let item
      if (index !== -1) {
        item = this.items[index]
        item.quantity = item.quantity + newItem.quantity
        this.items.splice(index, 1)
        this.items.unshift(item)
      } else {
        this.items.unshift(newItem)
        item = newItem
      }
      if (this.isEnableSnMode) {
        this.itemInEdit = item
        this.itemInEdit.isEditing = true
      }
      this.updateItems(this.items)
    },
    findItemIndex (newItem) {
      let index = this.items.findIndex((element) => {
        return this.compareTrackings(element.trackings, newItem.trackings) && element.upc === newItem.upc && !element.isUploaded
      })
      return index
    },
    compareTrackings (first, second) {
      // need to compare both direction in case one array is longer than the other
      return first.every((ele, index) => {
        return deepEqual(ele.barcode, second[index].barcode)
      }) && first.length === second.length
    },
    updateItems (allItems) {
      if (allItems.length === 0) {
        this.updateFlag(false)
      }
      this.items = allItems
      this.$emit('input', allItems)
      window.localStorage.setItem('items' + this.uid, JSON.stringify(allItems))
    },
    updateFlag (flag) {
      this.isDisabled = flag
      window.localStorage.setItem('flag' + this.uid, JSON.stringify(flag))
    },
    copyTextToClipboard (event, separator = ' ') {
      var formatText = this.items
        .map((element) => {
          // eslint-disable-next-line
          let {trackings, upc, desc, quantity, note} = element
          return {trackings, upc, quantity}
        })
        .map((k) => {
          return Object.keys(k).map((subkey) => {
            let value = ''
            if (subkey === 'trackings') {
              value = k[subkey].map(g => g.tracking).join(', ')
            } else {
              value = k[subkey]
            }
            return value
          }).join(separator)
        }).join('\n')

      copyToClipboard(formatText)
    },
    deleteData (item) {
      if (confirm('Are you sure to delete this item?')) {
        let {trackings, upc} = item
        let newItems = this.items.filter((element, index) => {
          return !(this.compareTrackings(element.trackings, trackings) && element.upc === upc)
        })
        if (item.attachments && item.attachments.length) {
          Promise.all(item.attachments.map(file => this.$store.dispatch('removeFile', file.fullPath)))
        }
        this.updateItems(newItems)
      }
    },
    showAddNote (trackings, upc) {
      let currentItem = this.items.find((element) => {
        return this.compareTrackings(element.trackings, trackings) && element.upc === upc
      })

      this.notecache = {
        attachments: currentItem.attachments || [],
        quantity: currentItem.quantity,
        note: currentItem.note,
        isAbnormal: currentItem.isAbnormal || false,
        abnormalQty: currentItem.abnormalQty || 0,
        trackings, 
        upc
      }
      this.addNotedialog = true
    },
    addNote () {
      let newItems = this.getNewItems()
      this.updateItems(newItems)
      this.clearFiles += 1
      this.addNotedialog = false
      this.notecache = {}
    },
    abnormalQtyLeItemQty (qty) {
      return qty <= this.notecache.quantity || 'Abnormal quantity must less than or equal to item\'s quantity'
    },
    deleteAllData () {
      if (confirm('Are you sure to delete all items?')) {
        if (this.items.some(item => !item.isUploaded)) {
          if (confirm('There are packages not uploaded, are you sure to delete all items?')) {
            this.updateItems([])
          }
        } else {
          this.updateItems([])
        }
        this.setUploadId('')
      }
    },
    showToast (info, level = 'error', event) {
      this.toastText = info
      this.toastEnable = true
      this.toastColor = level
      if (level === 'error') {
        this.playSound('warning')
        event && event.target.select()
        throw Error(info)
      }
    },
    highlightBarcode (event) {
      event.target.select()
    },
    setUploadId (id) {
      this.uploadRequestId = id
      window.localStorage.setItem('uploadId' + this.uid, id)
    },
    isItemTrackingInCache (item) {
      return item.trackings.some(tracking => 
        tracking.barcode.some(barcode => 
          this.trackingCacheSet.has(barcode)))
    },
    uploadItems () {
      this.uploadRequestId || (this.setUploadId(getRandomIdByTime(3)))
      let itemsRemain = this.items.filter(item => !item.isUploaded)
      if (itemsRemain.length === 0) return Promise.resolve('There is no item to upload')
      if (!this.currentWarehouseSite.key) {
        this.showToast('Please select a warehouse')
        this.playSound('warnnig')
        return Promise.resolve('missing warehouse site')
      }
      if (!confirm('Do you want to upload all packages now?')) return Promise.resolve('Upload canceled!')

      let {key, state, zip, siteName} = this.currentWarehouseSite
      if (itemsRemain.some(item => this.isItemTrackingInCache(item))) {
        if (prompt('Some tracking numbers have recently been uploaded. Continue may result in duplicate records. Do you want to continue? \n(Type "dup" to continue)') !== 'dup') return Promise.resolve('Upload canceled!')
      }
      return this.$store.dispatch('uploadItems', {uploadRequestId: this.uploadRequestId, items: itemsRemain.map(({keywordString, ...rest}) => rest), warehouseSite: key, siteName: state + ' - ' + zip + ' - ' + siteName})
        .then((uploadResult) => {
          this.setUploadId('') // clear request id so that we can upload new data
          let {uploadedFlags: packagesUploaded, status} = uploadResult
          if (status === 'in-progress') {
            return // do nothing here
          }
          itemsRemain.forEach((element, index) => {
            packagesUploaded[index] && (element.isUploaded = packagesUploaded[index])
          })
          this.updateItems(this.items.sort((a, b) => a.isUploaded - b.isUploaded))
          if (packagesUploaded.length && packagesUploaded.every(item => item === 1)) {
            this.showToast('upload completed', 'success')
            this.updateFlag(true)
          } else {
            return alert('Some packages failed to upload, please fix and upload again.')
          }

          this.cache = {
            trackings: []
          }
          this.productCache = {}
        })
        .catch((error) => {
          console.log(error.message)
          this.showToast('upload error. Try again')
        })
    },
    findOrganizationId (key) {
      let org = this.organizations.find(element => element.key === key)
      return org && org.organizationId
    },
    getProductIdWithFlag (item) {
      return item.upc + (item.flag ? '*' : '')
    },
    displayProductCacheKeyWithFlag (key) {
      return key + (this.productCache[key] && this.productCache[key].flag ? '*' : '')
    },
    async organizationChanged (organizationKey, item) {
      let index = this.findItemIndex(item)
      if (index !== -1 && (this.organizations.some(item => item.key === organizationKey) || organizationKey === '' || organizationKey === undefined)) {
        let oldItem = this.items[index]
        oldItem.organizationKey = organizationKey || ''
        this.updateItems(this.items)
      }
    },
    quantityChanged (event, item) {
      let index = this.findItemIndex(item)
      if (index !== -1) {
        let oldItem = this.items[index]
        oldItem.quantity = parseInt(event) || 0
        this.updateItems(this.items)
      }
    },
    snChanged (event) {
      this.$set(this.itemInEdit, 'snArray', event)
      this.itemInEdit.keywordString = this.itemInEdit.trackings.map(item => item.barcode.join(',')).join(',') + event.join(',')
      this.updateItems(this.items)
    },
    clearSelectionCache (e) {
      e.target.value = null
    },
    fileSelected (e) {
      let rABS = true // true: readAsBinaryString ; false: readAsArrayBuffer
      let files = e.target.files
      if (files.length === 0) {
        console.log('no file seleceted')
        return
      }
      let f = files[0]
      let workbook = null
      this.workbookData = null
      let reader = new FileReader()
      reader.onload = e => {
        let data = e.target.result
        if (!rABS) data = new Uint8Array(data)
        workbook = xlsx.read(data, {type: rABS ? 'binary' : 'array'})
        this.processWorkbook(workbook)
      }
      if (rABS) reader.readAsBinaryString(f)
      else reader.readAsArrayBuffer(f)
    },
    processWorkbook (workbook) {
      this.importing = true
      let currentSoundSetting = this.soundToggle
      this.soundToggle = false
      setTimeout(() => { // just to show buttonloading
        let sheetNames = workbook.SheetNames
        let rawData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetNames[0]])
        let trackingField, upcField, quantityField
        let lineNumber
        trackingField = rawData[0]['tracking'] ? 'tracking' : (rawData[0]['TRACKING'] ? 'TRACKING' : (rawData[0]['Tracking'] ? 'Tracking' : ''))
        upcField = rawData[0]['upc'] ? 'upc' : (rawData[0]['UPC'] ? 'UPC' : '')
        quantityField = rawData[0]['quantity'] ? 'quantity' : (rawData[0]['QUANTITY'] ? 'QUANTITY' : (rawData[0]['Quantity'] ? 'Quantity' : ''))

        try {
          if (!trackingField || !upcField || !quantityField) this.showToast('Column name invalid.')

          let barcode1, barcode2
          if (this.isTrackingMode) {
            barcode1 = trackingField
            barcode2 = upcField 
          } else {
            barcode1 = upcField
            barcode2 = trackingField
          }

          rawData.forEach((line, index) => {
            lineNumber = index
            let quantity = parseInt(line[quantityField])
            let i

            // add tracking
            this.barcode = line[barcode1].toString().trim()
            let carrierMaybe = this.guessCarrier(this.barcode)
            if (carrierMaybe.length > 0) {
              this.addTracking(carrierMaybe)
            } else {
              this.addTracking([{tracking: [this.barcode]}])
            }
            // add upc
            for (i = 0; i < quantity; i++) {
              this.barcode = line[barcode2].toString().trim()
              this.addBarcode()
            }
          })
        } catch (e) {
          console.error(`error in line ${lineNumber + 2}. `, e.message)
        } finally {
          this.importing = false
          this.soundToggle = currentSoundSetting
        }
      }, 200)
    },
    setNoteTemplate (template) {
      this.notecache.note = template
    },
    handleSpecialBarcode () {
      this.barcode = this.barcode.trim()
      const firstChar = this.barcode[0]
      const lastChar = this.barcode.slice(-1)
      if (firstChar === '[' && lastChar === ']') {
        this.barcode = this.barcode.slice(1, -1)
        this.forceAddTracking()
        return true
      }
      if (firstChar === '{' && lastChar === '}') {
        this.barcode = this.barcode.slice(1, -1)
        this.forceAddUpc()
        return true
      }

      if (['*t*', '*tracking*'].includes(this.barcode.toLowerCase())) {
        this.forceMode = 'tracking'
        this.barcode = ''
        this.playSound('success')
        return true
      }
      if (['*u*', '*upc*'].includes(this.barcode.toLowerCase())) {
        this.forceMode = 'upc'
        this.barcode = ''
        this.playSound('success')
        return true
      }
      if (['**'].includes(this.barcode.toLowerCase())) {
        this.forceMode = ''
        this.barcode = ''
        this.playSound('success')
        return true
      }

      return false
    },
    getNewItems () {
      return this.items.map((element, idx) => {
        if (this.compareTrackings(element.trackings, this.notecache.trackings) && element.upc === this.notecache.upc) {
          element.note = this.notecache.note || ''
          element.attachments = [...this.notecache.attachments, ...this.attachments]
          if (!element.attachments.length) delete element.attachments
          element.isAbnormal = (this.notecache.isAbnormal && this.notecache.abnormalQty > 0) || false
          if (element.isAbnormal) {
            element.abnormalQty = this.notecache.abnormalQty
            element.normalQty = element.quantity - this.notecache.abnormalQty
          }
        }
        return element
      })
    },
    removeUploadFile (file) {
      return this.$store.dispatch('removeFile', file.fullPath)
        .then(() => {
          this.notecache.attachments = this.notecache.attachments.filter(({fullPath}) => file.fullPath !== fullPath)
          let items = this.getNewItems()
          this.updateItems(items)
        })
    },
    updateItemUpcInfo ({upc, size}) {
      this.items = this.items.map(item => {
        if (item.upc === upc) {
          item.size = size
        }
        return item 
      })
    },
    showSnEditDialog (item) {
      this.itemInEdit = item
      this.snEditDialog = true
    }
  },
  props: {
    value: Array
  }
}
</script>

<style>
  .b-center input[type=text] {
    text-align: center;
  }

  .denseList {
    min-height: 64px;
  }

  .denseList .list__tile {
    height: 25px!important;
  }

  .myDense .datatable td, .myDense .datatable th {
    height: 10px !important;
    padding: 0 auto !important;
  }

  .upload-file {
    overflow: hidden;
  }

  .upload-file input[type=file] {
    position: absolute;
    top: 0;
    right: 0;
    min-width: 100%;
    min-height: 100%;
    text-align: right;
    filter: alpha(opacity=0);
    opacity: 0;
    outline: none;
    cursor: inherit;
    display: block;
  }

  .text-xs-right .v-menu .v-menu__activator {
    justify-content: flex-end;
  }

  .item-with-dup-tracking {
    background-color: rgb(255, 255, 87);
  }
</style>
