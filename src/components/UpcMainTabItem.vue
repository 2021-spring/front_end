<template>
  <div>
    <v-layout>
      <v-flex>
        <v-btn color="primary" @click="showAddItemDialog">
          <v-icon dark>add</v-icon> {{ addItemBtnText }}
        </v-btn>
        <v-btn v-if="isEditMode" color="secondary" :disabled="loading" @click.stop="cancelEditData()">
          Cancel
        </v-btn>
        <v-btn color="primary" :disabled="loading" @click.stop="isEditMode ? saveEditData() : enterEditData()">
          {{isEditMode ? 'Save' : 'Edit'}}
        </v-btn>
      </v-flex>
      <v-spacer></v-spacer>
      <v-flex v-if="!isEditMode">
        <v-layout>
          <v-text-field
            prepend-icon="view_week"
            label="barcode"
            single-line
            hide-details
            v-model="barcode"
            clearable
          ></v-text-field>
          <v-btn color="primary" @click="printBarcode">
            <v-icon dark>print</v-icon> 
          </v-btn>
        </v-layout>
      </v-flex>
      <v-spacer></v-spacer>
      <v-flex xs5 md3>
        <v-text-field
          append-icon="search"
          label="Search"
          single-line
          hide-details
          v-model="search"
          clearable
          @keyup.enter="filterEnter"
        ></v-text-field>
      </v-flex>
    </v-layout>
    <v-layout align-baseline justify-start>
      <v-flex class="success--text caption"><span class="realtime-border px-1">REAL TIME</span></v-flex>
    </v-layout>
    <v-data-table
      :headers="headers"
      :items="items"
      :search="search"
      :loading="loading"
      :pagination.sync="pagination"
      :rows-per-page-items="rowPerPage"
      class="elevation-1"
      >
      <template v-slot:progress>
        <v-progress-linear color="blue" indeterminate></v-progress-linear>
      </template>
      <template v-slot:items="props">
        <td class="text-xs-left" v-if="mode === 'upc'">{{ props.item.upc }}</td>
        <td class="text-xs-left" v-else>{{ props.item.sku }}</td>
        <td class="text-xs-left" v-if="mode === 'sku'">{{ organizationKeyToId.get(props.item.organizationKey) }}</td>
        <td class="text-xs-left">
          <template v-if="isEditMode">
            <v-text-field
              v-model="props.item.description"
              ></v-text-field>
          </template>
          <template v-else>
            {{ props.item.description }}
          </template>
        </td>
        <td class="text-xs-left">
          <template v-if="isEditMode">
            <v-combobox
              v-model="props.item.location"
              chips
              multiple
              deletable-chips
              clearable></v-combobox>
          </template>
          <template v-else>
            {{ props.item.location && props.item.location.join(', ') }}
          </template>
        </td>
        <td class="text-xs-left">
          <template v-if="isEditMode">
            <v-select
              v-model="props.item.size"
              :items="sizes"
              item-text="name"
              item-value="sortKey"
              :disabled="loading"
              ></v-select>
            <v-text-field
              v-if="props.item.size === 'custom'"
              v-model.number="props.item.unitFee"
              prefix="$"
              solo></v-text-field>
          </template>
          <template v-else>{{ getFeeString(props.item) }}</template>
        </td>
        <td>
          <v-layout justify-center>
            <v-tooltip top>
              <template v-slot:activator="{ on }">
                <v-btn v-on="on" icon flat color="primary" :disabled="JSON.stringify(props.item.approvedSkus) === '{}'" @click="showSkuDetailDialog(props.item)">
                  <v-icon>info</v-icon>
                </v-btn>
              </template>
              <span> Approved SKUs </span>
            </v-tooltip>
            <v-btn v-if="!isEditMode" dark color="red" icon flat @click.stop="deleteItem(props.item)">
              <v-icon dark>cancel</v-icon>
            </v-btn>
          </v-layout>
        </td>
      </template>
      <div slot="no-results" class="text-xs-center">
        <v-icon>warning</v-icon>
        Your search for "{{ search }}" found no results.
      </div>
    </v-data-table>
    <SimpleTextPopup
      title="Approved SKUs"
      v-model="showApprovedSkus"
      @popupClose="showApprovedSkus = false"
      :hideRgtBtn="true"
      medium>
      <template v-slot:input>
        <v-container fluid>
          <v-data-table
            :headers="[
              { text: 'Index', sortable: false, value: 'upc' },
              { text: 'Organization', sortable: false, value: 'upc', width: '15%' },
              { text: 'Skus', sortable: false, value: 'keywordForSearch' }
            ]"
            :items="selectedUpcDetails"
            class="levation-2 myDense"
            :pagination.sync="pagination"
            item-key="upc"
            :rows-per-page-items="rowPerPage">
            <template v-slot:items="props">
              <td class="subheading">{{ props.index + 1}}</td>
              <td class="text-xs-left">{{ organizationKeyToId.get(props.item.organizationKey) }}</td>
              <td class="text-xs-left">
                <v-layout>
                  <v-chip v-for="sku in props.item.approvedSkus" :key="sku">{{ sku }}</v-chip>
                </v-layout>
              </td>
            </template>
          </v-data-table>
        </v-container>
      </template>
    </SimpleTextPopup>
  </div>
</template>

<script>
import SimpleTextPopup from './SimpleTextPopup'
import { saveBarcodeImage, deepEqual, mediaTools } from '@/utils/tools'

export default {
  name: 'UpcMainTabItem',
  components: {
    SimpleTextPopup
  },
  mixins: [mediaTools],
  data () {
    return {
      mode: 'upc',
      addItemBtnText: 'Add UPC',
      toastColor: 'error',
      toastEnable: false,
      toastText: '',
      editUpcDialog: false,
      deleteUpcDialog: false,
      toastMsgs: [],
      search: '',
      upcCache: {},
      rowPerPage: [15, 30, 50, {text: 'All', value: -1}],
      pagination: {
        sortBy: 'upc'
      },
      headers: [
        { text: 'UPC', sortable: false, value: 'upc', width: '15%' },
        { text: 'Description', sortable: false, value: 'description' },
        { text: 'Location', sortable: false, value: 'location' },
        { text: 'Size', sortable: false, value: 'size', width: '20%' },
        { text: 'Action', sortable: false, align: 'center', value: 'keywordForSearch', width: '10%' }
      ],
      isEditMode: false,
      cachedItems: [],
      loading: false,
      tab: 'SKU',
      tabs: [
        'UPC', 'SKU'
      ],
      model: 'tab-2',
      selectedUpcDetails: [],
      showApprovedSkus: false,
      barcode: ''
    }
  },
  computed: {
    items () {
      return this.isEditMode ? this.cachedItems : this.upcs
    },
    upcs () {
      return Object.values(this.$store.getters.upcMap)
    },
    sizes () {
      return this.$store.getters.upcSizes
    },
    sortKeyToSize () {
      return new Map([
        ...this.sizes.map(item => [item.sortKey, item.name]),
        ...this.sizes.map(item => [item.name, item.name])
      ])
    },
    sizeToSortKey () {
      return new Map([
        ...this.sizes.map(item => [item.name, item.sortKey]),
        ...this.sizes.map(item => [item.sortKey, item.sortKey]),
        ['custom', 'custom']
      ])
    },
    organizationKeyToId () {
      return this.$store.getters.organizationKeyToId
    }
  },
  methods: {
    showAddItemDialog () {
      this.$emit('showAddUpcDialog')
    },
    filterEnter (event) {
      event.target.select()
      this.hintSound()()
    },
    showSkuDetailDialog (item) {
      this.showApprovedSkus = true
      this.selectedUpcDetails = Object.keys(item.approvedSkus).map(organizationKey => {
        return {
          organizationKey,
          approvedSkus: item.approvedSkus[organizationKey]
        }
      })
    },
    hasChangedItems () {
      return this.cachedItems.filter(upcObj => { return upcObj.upc && this.$store.getters.upcMap[upcObj.upc].size !== upcObj.size }) > 0
    },
    enterEditData () {
      this.cachedItems = this.upcs.map(upc => { 
        if (upc.size) {
          upc.size = this.sizeToSortKey.get(upc.size)
        }
        return {...upc} 
      })
      if (!this.cachedItems) this.cachedItems = []
      this.isEditMode = true
    },
    leaveEditMode () {
      this.isEditMode = false
      this.cachedItems = []
      this.loading = false
    },
    cancelEditData () {
      if (this.hasChangedItems() && !confirm('Do you want to cancel all changes?')) return
      this.leaveEditMode()
    },
    saveEditData () {
      if (this.hasChangedItems() && !confirm('Do you want to save all changes?')) return
      if (this.cachedItems.some(upc => (upc.size === 'custom' && !upc.unitFee))) {
        return alert('Custom size upcs must have a unit fee.')
      }
      this.loading = true
      let changedUpc = this.cachedItems.filter(upcObj => !deepEqual(this.$store.getters.upcMap[upcObj.upc], upcObj))
      if (changedUpc.length === 0) {
        this.leaveEditMode()
        return
      }
      return Promise.all(changedUpc.map(upcObj => {
        return this.$store.dispatch('updateUpc', upcObj)
      }))
        .then(() => {
          this.leaveEditMode()
        })
    },
    deleteItem (payload) {
      if (confirm('Are you sure to delete this UPC?')) {
        this.$store.dispatch('deleteUpc', payload)
      }
    },
    getFeeString (item) {
      if (!item.size && item.size !== 0) return ''
      if (item.size === 'custom' && item.unitFee) {
        return `${item.size}($${item.unitFee})`
      }
      return this.sortKeyToSize.get(item.size)
    },
    printBarcode () {
      if (!this.barcode) return alert('Please enter barcode')
      saveBarcodeImage(this.barcode, this.barcode, false)
    }
  }
}
</script>
