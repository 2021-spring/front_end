<template>
  <v-container fluid>
    <FormSubmitPopup
      v-if="isTaskShipToWarehouse"
      :title="title"
      v-model="value"
      @popupClose="$emit('input', false)"
      large
      showNavigator
      @getNextItem="switchTask(true)"
      :getNextItemDisabled="isLastTask"
      @getPreviousItem="switchTask(false)"
      :getPreviousItemDisabled="isFirstTask">
      <template v-slot:input>
        <v-container class="taskConfirm">
          <v-layout>
            <v-flex class="text-xs-left fontGreen" v-if="task.isRemoved"><b>This task has been removed.</b></v-flex>
          </v-layout>
          <v-text-field
            label="Product name"
            v-model.number="task.productName"
            readonly></v-text-field>
          <v-layout>
            <v-flex>
              <v-text-field
                label="Remain quantity"
                :value="task.isRemoved ? 0 : task.quantity"
                readonly></v-text-field>
            </v-flex>
            <v-flex>
              <v-text-field
                id="newOffer_price"
                label="Price"
                prepend-icon="attach_money"
                v-model.number="task.price"
                readonly></v-text-field>
            </v-flex>
            <v-flex>
              <v-text-field
                label="Organization name"
                prepend-icon="business"
                v-model.number="task.tenantName"
                readonly></v-text-field>
            </v-flex>
          </v-layout>
          <v-textarea
            id="newOffer_note"
            label="Tracking numbers"
            outline
            v-model="trackingNums"
            class="thinBox"></v-textarea>
          <v-layout>
            <v-flex class="text-xs-left errorFont" v-if="errorMessage">{{errorMessage}}</v-flex>
            <v-flex class="text-xs-left errorFont" v-if="unconfirmedAvailablePackages.some(pkg => pkg.isTaskTooOldForPkg)">Some of packages can't be confirmed for this task. Confirming a package for an old task is not allowed.</v-flex>
            <v-flex class="text-xs-right">
              <v-layout justify-end>
                <LoaderButton
                  :buttonText="`Search`"
                  :promiseAwait="saveAndSearch"
                  :disabled="isConfirmRunning || !trackingNums || trackingNums.trim().length === 0 || task.isRemoved"
                  ></LoaderButton>
              </v-layout>
            </v-flex>
          </v-layout>
          <v-tabs
            color="transparent"
            v-model="tab"
            show-arrows
          >
            <v-tabs-slider color="primary"></v-tabs-slider>
            <v-tab v-for="(tabItem, index) in tabs" :key="tabItem">
              <v-badge class="notification" :value="index === 1 && (unconfirmedWrongOrgKeyTrackings.length || unmatchedTrackings.length || unconfirmedWrongOrgKeyTrackings.length)" color="red">
                <template v-slot:badge>
                  <div dark></div>
                </template>
                <span class="tabItem">{{ tabItem }}</span>
              </v-badge>
            </v-tab>
            <v-tabs-items v-model="tab" touchless>
              <v-tab-item v-for="(item, index) in 2" :key="'item' + index">
                <v-data-table
                  v-if="tab === 0 && index === 0"
                  :headers="headers"
                  :items="packages"
                  class="elevation-2 myDense"
                  :search="filter"
                  ref="offerTable"
                  :pagination.sync="pagination"
                  :rows-per-page-items="rowPerPage">
                  <template v-slot:headerCell="props">
                    <template v-if="props.header.text.toLowerCase() === 'qty'">
                      {{ props.header.text }}({{totalOfFilteredItems}})
                    </template>
                    <template v-else-if="props.header.text.toLowerCase() === 'status'">
                      <div v-if="!searchedPackages.length">{{ props.header.text }}</div>
                      <v-tooltip top v-else>
                        <template v-slot:activator="data">
                          <v-checkbox v-model="selectAllValue" v-on="data.on" :label="`Select all(${selectedQty})`" :value="true" @change="onSelectAll" class="select-all" :indeterminate="unconfirmedAvailablePackages.some(pkg => pkg.isTaskTooOldForPkg) || !unconfirmedAvailablePackages.length"></v-checkbox>
                        </template>
                        <span>{{ unconfirmedAvailablePackages.some(pkg => pkg.isTaskTooOldForPkg) ? `Some of packages can't be confirmed` : 'Click to select all.' }}</span>
                      </v-tooltip>
                    </template>
                    <template v-else>
                      {{ props.header.text }}
                    </template>
                  </template>
                  <template v-slot:items="props">
                    <td class="subheading">{{ props.item.trackingConfirmed.join(', ') }}</td>
                    <td class="text-xs-left">{{ props.item.quantity }}</td>
                    <td class="text-xs-left">{{ dateForm(props.item.date || props.item.createTime || props.item.confirmTime) }}</td>
                    <td class="text-xs-left">{{ props.item.upc }}</td>
                    <td class="text-xs-left">
                      <v-layout>
                        <v-checkbox hide-details v-model="selectedPackages" :value="props.item" multiple @change="onSelectOne" v-if="props.item.trackings && !props.item.isConfirmed" :disabled="props.item.isTaskTooOldForPkg"></v-checkbox>
                        <v-flex v-else>Confirmed</v-flex>
                      </v-layout>
                    </td>
                  </template>
                </v-data-table>
                  <template v-if="unconfirmedWrongOrgKeyTrackings.length || otherTaskConfirmedTrackings.length || unmatchedTrackings.length">
                    <v-card v-if="tab === 1 && index === 1">
                      <v-card-text>
                        <v-layout v-if="unconfirmedWrongOrgKeyTrackings.length" class="mb-3" column>
                          <v-flex class="font-weight-bold">Abnormal (please contact your organization)</v-flex>
                          <v-flex>
                            <router-link
                              v-for="tracking in unconfirmedWrongOrgKeyTrackings"
                              :to="'/UserPackage?tracking=' + tracking"
                              v-text="tracking + ' '"
                              :key="tracking"
                            /> 
                          </v-flex>
                        </v-layout>
                        <v-layout v-if="otherTaskConfirmedTrackings.length" class="mb-3" column>
                          <v-flex class="font-weight-bold">Confirmed in other tasks</v-flex>
                          <v-flex>{{otherTaskConfirmedTrackings.join(', ')}}</v-flex>
                        </v-layout>
                        <v-layout v-if="unmatchedTrackings.length" column>
                          <v-flex class="font-weight-bold">Not found</v-flex>
                          <v-flex>{{unmatchedTrackings.join(', ')}}</v-flex>
                        </v-layout>
                      </v-card-text>
                    </v-card>
                  </template>
              </v-tab-item>
            </v-tabs-items>
          </v-tabs>
        </v-container>
      </template>
      <template v-slot:right_button>
        <LoaderButton
          buttonText="Confirm"
          v-model="isConfirmRunning"
          :promiseAwait="confirmWarehousePackage"
          :disabled="selectedPackages.length === 0 || task.isRemoved || !task.isLinkToActiveOffers"
          ></LoaderButton>
      </template>
    </FormSubmitPopup>
    <FormSubmitPopup
      v-else
      :title="title"
      v-model="value"
      @popupClose="$emit('input', false)"
      :rightMethod="onSubmitted"
      :large="$vuetify.breakpoint.smAndDown"
      showNavigator
      rightButtonText="Confirm"
      :rightButtonDisabled="task.isRemoved || !task.isLinkToActiveOffers"
      @getNextItem="$emit('getNextItem')"
      :getNextItemDisabled="isLastTask"
      @getPreviousItem="$emit('getPreviousItem')"
      :getPreviousItemDisabled="isFirstTask">
      <template v-slot:input>
        <v-container class="taskConfirm">
          <v-layout>
            <v-flex class="text-xs-left fontGreen" v-if="task.isRemoved">This task has been removed.</v-flex>
          </v-layout>
          <v-text-field
            label="Product name"
            v-model.number="task.productName"
            prepend-icon="devices_others"
            readonly
            ></v-text-field>
            <v-text-field
              label="Organization name"
              prepend-icon="business"
              v-model.number="task.tenantName"
              readonly></v-text-field>
          <v-text-field
            id="newOffer_price"
            label="Price"
            prepend-icon="attach_money"
            :value="task.bonus ? parseFloat(task.price) + parseFloat(task.bonus) : parseFloat(task.price)"
            readonly></v-text-field>
          <v-select
            v-model="warehouseSite"
            :items="userSites"
            item-text="siteFullName"
            prepend-icon="local_shipping"
            return-object
            label="Location"
            single-line
            no-data-text="No data available, please add storgae in profile"
            :rules="[fieldIsRequired('Location')]"
            class="required_field self-storage"
            :hint=" (!userSites || !userSites.length) ? `No self storage is defined. Please add one in Profile page` : ''"
          ></v-select>
          <v-text-field
            label="Quantity"
            v-model.number="confirmQty"
            prepend-icon="dehaze"
            :rules="[rules.checkQty, fieldIsRequired('quantity'), fieldIsOverZero('quantity'), fieldIsInteger('quantity')]"
            class="required_field"></v-text-field>
        </v-container>
      </template>
    </FormSubmitPopup>
  </v-container>
</template>

<script>
import FormSubmitPopup from './FormSubmitPopup'
import {splitTrackingNum, toDateString, checkRules, normalizeInputString} from '../utils/tools'
import LoaderButton from './LoaderButton'

export default {
  name: 'TaskConfirm',
  components: {
    FormSubmitPopup,
    LoaderButton
  },
  mixins: [checkRules],
  data () {
    return {
      tab: 0,
      tabs: [
        'Confirmable', 'Unconfirmable'
      ],
      expirationPicker: false,
      rules: {
        checkQty: (value) => {
          return value > this.task.quantity ? 'Exceed task quantity' : true
        }
      },
      pagination: {
        sortBy: 'isConfirmed'
      },
      filter: '',
      rowPerPage: [30, 50, {text: 'All', value: -1}],
      confirmQty: 0,
      warehouseSite: {},
      trackingNums: '',
      trackingArr: [],
      headers: [
        { text: 'Tracking #', align: 'left', sortable: true, value: 'trackingNum' },
        { text: 'Qty', value: 'quantity', align: 'left', sortable: false },
        { text: 'Date', value: 'dateString', align: 'left', sortable: true },
        { text: 'UPC', value: 'upc', align: 'left', sortable: true },
        { text: 'Status', value: 'action', align: 'left', sortable: false, width: '20%' }
      ],
      selectedPackages: [],
      selectAllValue: null,
      errorMessage: null,
      isConfirmRunning: false,
      unmatchedTrackings: [],
      searchedPackages: []
    }
  },
  created () {
    this.$store.dispatch('getUserSites')
    this.trackingNums = this.task.trackingNums || ''
    this.confirmQty = 0
    this.warehouseSite = {}
    this.selectAllValue = null
  },
  watch: {
    task () {
      this.trackingNums = this.task.trackingNums || ''
    }
  },
  computed: {
    curTaskConfirmedPackages () {
      return this.task.confirmedPackages || []
    },
    confirmedTrackings () {
      const trackings = new Set(this.searchedPackages
        .filter(pkg => pkg.isConfirmed)
        .reduce((acc, pkg) => [...acc, ...pkg.trackingConfirmed], []))
      return [...trackings]
    },
    unconfirmedPackages () {
      return this.searchedPackages.filter(pkg => !pkg.isConfirmed)
    },
    userSites () {
      let sites = [...this.$store.getters.sites]
      let siteDetails = []
      sites.forEach((site) => {
        siteDetails.push({
          siteName: site.state + ' - ' + site.zip + ' - ' + site.siteName,
          siteFullName: (site.address2 === '') ? (site.address1 + ', ' + site.city + ', ' + site.state + ' ' + site.zip) : (site.address1 + ', ' + site.address2 + ', ' + site.city + ', ' + site.state + ' ' + site.zip)
        })
      })
      return siteDetails
    },
    curTaskConfirmedTrackings () {
      return this.curTaskConfirmedPackages.reduce((acc, item) => {
        return [...acc, ...item.trackingConfirmed]
      }, [])
    },
    packages () {
      return [...this.unconfirmedAvailablePackages, ...this.curTaskConfirmedPackages]
    },
    unconfirmedAvailablePackages () {
      return this.unconfirmedPackages.filter(pkg => !pkg.isAbnormal && pkg.organizationKey === this.task.tenantKey)
    },
    unconfirmedWrongOrgKeyTrackings () {
      return [...new Set(this.unconfirmedPackages.filter(pkg => {
        return pkg.organizationKey !== this.task.tenantKey
          || pkg.isAbnormal
      }).reduce((acc, item) => [...acc, ...item.trackingConfirmed], []))]
    },
    otherTaskConfirmedTrackings () {
      return this.confirmedTrackings.filter(tracking => !this.curTaskConfirmedTrackings.includes(tracking))
    },
    totalOfFilteredItems () {
      return this.packages.reduce((accu, item) => { return item.quantity ? (accu + item.quantity) : accu }, 0)
    },
    isTaskShipToWarehouse () {
      return this.task.warehouse && this.task.warehouse.toLowerCase() === 'warehouse'
    },
    selectedQty () {
      return this.selectedPackages.reduce((acc, item) => {
        return acc + item.quantity
      }, 0)
    }
  },
  methods: {
    switchTask (isNext) {
      this.searchedPackages = []
      this.clearSelection()
      this.$emit(isNext ? 'getNextItem' : 'getPreviousItem')
    },
    clearSelection () {
      this.selectAllValue = null
      this.selectedPackages = []
    },
    dateForm (timestamp) {
      return toDateString(timestamp)
    },
    saveAndSearch () {
      this.errorMessage = null
      this.clearSelection()
      const payload = {
        trackingNums: this.trackingNums.toUpperCase(),
        taskId: this.task.taskKey
      }
      this.trackingArr = [...new Set(splitTrackingNum(this.trackingNums))].map(tracking => normalizeInputString(tracking))
      this.$store.dispatch('saveTrackings', payload)
      return this.findPackageByTrackings()
    },
    onSelectAll (e) {
      if (this.unconfirmedAvailablePackages.some(pkg => pkg.isTaskTooOldForPkg)) return
      if (e) {
        this.selectedPackages = [...this.unconfirmedAvailablePackages]
      } else {
        this.selectedPackages = []
      }
    },
    onSelectOne (e) {
      if (this.unconfirmedAvailablePackages.length) {
        if (e.length < this.unconfirmedAvailablePackages.length) {
          this.selectAllValue = null
        } else {
          this.selectAllValue = true
        }
      }
    },
    findPackageByTrackings () {
      const payload = {
        productId: this.task.productId,
        tenantKey: this.task.tenantKey,
        warehouseKeys: this.task.warehouseKeys,
        trackingArr: this.trackingArr.filter(tracking => !this.curTaskConfirmedPackages.some(pkg => pkg.trackingConfirmed.includes(tracking))),
        taskCreateTime: this.task.createTime
      }
      return this.$store.dispatch('getPackagesByTrackings', payload)
        .then(({unmatchedTrackings, searchedPackages}) => {
          this.unmatchedTrackings = unmatchedTrackings
          this.searchedPackages = searchedPackages
        })
        .catch(error => {
          this.errorMessage = error.message
          throw error
        })
    },
    onSubmitted () {
      const payload = {
        ...this.task, 
        quantity: this.confirmQty, 
        siteName: this.warehouseSite.siteName,
        warehouseSite: this.warehouseSite.siteName
      }
      return this.$store.dispatch('confirmTask', payload)
        .catch(error => {
          this.$store.dispatch('showToast', {info: error.message, level: 'error'})
        })
    },
    confirmWarehousePackage () {
      this.errorMessage = null
      const payload = {
        ...this.task,
        packages: this.selectedPackages
      }
      return this.$store.dispatch('confirmTask', payload)
        .then(() => {
          if (payload.warehouse === 'warehouse') {
            let restPkgs = this.searchedPackages.filter(pkg => !payload.packages.some(item => item.packageID === pkg.packageID))
            this.searchedPackages = restPkgs
          }
        })
        .catch(error => {
          console.error('Confirm task failed. ', error.message)
          this.errorMessage = error.message
        })
        .finally(() => {
          this.clearSelection()
        })
    }
  },
  props: {
    value: Boolean,
    title: String,
    actionText: {
      type: String,
      default: 'ADD'
    },
    task: {
      type: Object,
      default: function () {
        return {
          isRemoved: true
        }
      }
    },
    isFirstTask: Boolean,
    isLastTask: Boolean
  }
}
</script>

<style>
.x-small.btn  {
  height: 25px;
  width: 25px;
  margin: 5px 4px;
}

.thinBox .input-group__input {
  border: 1px solid rgba(0,0,0,.54) !important;
}

.trackingFont {
  color: orange;
  height: 55px;
}

.errorFont {
  color: red;
  height: 55px;
}

.fontGreen {
  color: green;
}

.self-storage .input-group__hint {
  color: red !important; 
}

.select-all label {
  position: relative !important;
  max-width: 100% !important;
  text-align: center;
  font-size: 12px;
  left: inherit !important;
}

.taskConfirm .input-group__details {
  min-height: 0px;
}

.notification .v-badge__badge{
  width: 5px;
  height: 5px;
  top: -3px;
  right: -5px;
}
</style>
