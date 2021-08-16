<template>
  <v-container fluid>
    <v-tabs
      color="transparent"
      v-model="tab"
      show-arrows
    >
      <v-tabs-slider color="primary"></v-tabs-slider>
      <v-layout align-center justify-space-between>
        <span>
          <v-tab v-for="tabItem in tabs" :key="tabItem">
            {{ tabItem }}
          </v-tab>
        </span>
      </v-layout>
      <v-tabs-items v-model="tab" touchless>
        <v-tab-item>
          <v-layout v-if="!isAdmin">
            <v-flex xs3>
              <v-btn dark color="primary" @click.stop="showEditEeiDialog()"><v-icon dark>add</v-icon>EEI</v-btn>
            </v-flex>
            <v-flex><v-icon>info</v-icon> ITN will be created in 2 -- 10 minutes upon request.</v-flex>
          </v-layout>
          <PaginationController
            v-model="eeiHistory"
            getDataActionName="getEeiPagination"
            :historyLimit="historyLimit"
            searchBoxLabel="Search"
            searchBoxHint="Request ID / ITN"
            :select="isAdmin ? (selectedBalanceTable || {}).clientKey : null"
            haveSearchBox
            haveStartDate
          >
            <template v-slot:dataTable>
              <v-data-table
                :headers="headers"
                :items="eeiHistory"
                hide-actions
                item-key="_key"
                select-all="blue"
                v-model="selectedEei"
              >
                <template v-slot:items="props">
                  <td class="checkbox-align-center" @click="props.item.url && props.item.status !== 'canceled' && (props.selected = !props.selected)">
                    <v-layout>
                      <v-checkbox
                        :disabled="!props.item.url || props.item.status === 'canceled'"
                        @click.stop="() => { props.selected = !props.selected }"
                        :value="props.selected"
                        primary
                        hide-details
                      ></v-checkbox>
                    </v-layout>
                  </td>
                  <td class="text-xs-left">
                    <v-layout>
                      <strong>ID: </strong>{{ props.item.requestId }}
                    </v-layout>
                    <v-layout wrap v-if="props.item.clientName && isAdmin">
                      <span class="font-weight-bold">Client:&nbsp; </span>{{ props.item.clientName }}
                    </v-layout>
                    <v-layout justify-space-between v-for="(commodity, index) in props.item.commodities" :key="index">
                      <v-flex xs7>
                        {{ commodity.profileName }} （{{ commodity.scheduleBCode }}）
                      </v-flex>
                      <v-flex xs3>
                        {{ commodity.quantity }}
                      </v-flex>
                    </v-layout>
                  </td>
                  <td class="text-xs-left">
                    <LabelAddressWidget
                      :address="props.item.from"/>
                  </td>
                  <td class="text-xs-left">
                    <LabelAddressWidget
                      :address="props.item.to"/>
                  </td>
                  <td class="text-xs-left">
                    {{ props.item.status === 'rejected' ? props.item.message : props.item.itn }}
                  </td>
                  <td v-if="$store.getters.activeWarehouse" class="text-xs-left">
                    {{ organizationKeyToId.get(props.item.clientKey) }}
                  </td>
                  <td class="text-xs-left">
                    <v-layout>
                      {{ toDateYYYYMMDDHHmm(props.item.createTime) }}
                    </v-layout>
                    <v-layout>
                      {{ props.item.onboardDate }}
                    </v-layout>
                  </td>
                  <td class="text-xs-left">{{ props.item.status || 'pending' }}</td>
                  <td class="text-xs-left">
                    <v-layout>
                      <v-flex v-if="!props.item.status || props.item.status === 'pending'">
                        <v-tooltip top>
                          <template v-slot:activator="tooltip">
                            <div v-on="tooltip.on">
                              <LoaderButton
                                buttonIcon="refresh"
                                flat
                                :promiseAwait="getEeiStatus"
                                :promiseItem="props.item"
                              ></LoaderButton>
                            </div>
                          </template>
                          Get status
                        </v-tooltip>
                      </v-flex>
                      <v-flex v-else-if="!isAdmin">
                        <v-tooltip top>
                          <template v-slot:activator="tooltip">
                            <div v-on="tooltip.on">
                              <v-btn
                                icon
                                color="primary"
                                flat
                                @click="(e) => props.item.status === 'canceled' ? showRecreateEeiDialog(props.item) : showEditEeiDialog(props.item)"
                              >
                                <v-icon v-if="props.item.status === 'canceled'">content_copy</v-icon>
                                <v-icon v-else>edit</v-icon>
                              </v-btn>
                            </div>
                          </template>
                          {{ props.item.status === 'canceled' ? 'Copy EEI' : 'Update EEI' }}
                        </v-tooltip>
                      </v-flex>

                      <v-flex v-if="!['canceled', 'pending'].includes(props.item.status)">
                        <v-tooltip top>
                          <template v-slot:activator="tooltip">
                            <div v-on="tooltip.on">
                              <LoaderButton
                                buttonIcon="delete"
                                flat
                                :promiseAwait="cancelEei"
                                :promiseItem="props.item"                        
                              ></LoaderButton>
                            </div>
                          </template>
                          Cancel EEI
                        </v-tooltip>
                      </v-flex>
                    </v-layout>
                  </td>
                </template>
              </v-data-table>
            </template>
            <template v-slot:beforeMenu>
              <v-layout row wrap justify-space-between v-if="isAdmin">
                <v-flex md6>
                  <v-autocomplete
                    label="Select org"
                    v-model="selectedBalanceTable"
                    return-object
                    item-text="clientName"
                    :items="balances"
                    clearable></v-autocomplete>
                </v-flex>
              </v-layout>
            </template>
          </PaginationController>
        </v-tab-item>
      </v-tabs-items>
    </v-tabs>
    <EeiEditPopup
      v-model="eeiDialog"
      v-if="eeiDialog"
      :eeiInEdit="eeiInEdit"
      @submitted="onProcessEei"
      :isRecreate="isRecreate"/>
  </v-container>
</template>

<script>

import PaginationController from './PaginationController'
import LoaderButton from './LoaderButton'
import FormSubmitPopup from './FormSubmitPopup'
import EeiEditPopup from './EeiEditPopup'
import { checkRules, timeTools, measurementTools } from '../utils/tools'
import LabelAddressWidget from './LabelAddressWidget'

export default {
  name: 'Eei',
  components: {
    PaginationController,
    LoaderButton,
    FormSubmitPopup,
    EeiEditPopup,
    LabelAddressWidget
  },
  mixins: [checkRules, timeTools, measurementTools],
  data () {
    return {
      tab: null,
      tabs: [
        'EEI'
      ],
      rowPerPage: [15, 30, 50, {text: 'All', value: -1}],
      historyLimit: 25,
      eeiHistory: [],
      selectedEei: [],
      eeiDialog: false,
      eeiInEdit: {},
      headers: this.$store.getters.activeWarehouse ? [
        { text: 'Details <--> Quantity', value: 'signature', align: 'left', sortable: false, width: '30%' },
        { text: 'From', value: 'from', align: 'left', sortable: false },
        { text: 'To', value: 'to', align: 'left', sortable: false },
        { text: 'ITN', value: 'itn', align: 'left', sortable: false, width: '10%' },
        { text: 'Creator', value: 'clientKey', align: 'left', sortable: false },
        { text: 'Create time/Onboard Date', value: 'createTime', align: 'left', sortable: false },
        { text: 'Status', value: 'status', align: 'left', sortable: false },
        { text: 'Actions', value: '', align: 'left', sortable: false, width: '5%' }
      ] : [
        { text: 'Details <--> Quantity', value: 'signature', align: 'left', sortable: false, width: '30%' },
        { text: 'From', value: 'from', align: 'left', sortable: false },
        { text: 'To', value: 'to', align: 'left', sortable: false },
        { text: 'ITN', value: 'itn', align: 'left', sortable: false, width: '10%' },
        { text: 'Create time/Onboard date', value: 'createTime', align: 'left', sortable: false },
        { text: 'Status', value: 'status', align: 'left', sortable: false },
        { text: 'Actions', value: '', align: 'left', sortable: false, width: '5%' }
      ],
      isRecreate: false,
      isAdmin: false,
      selectedBalanceTable: {}
    }
  },
  mounted () {
    if (this.isAdmin && !this.balances.length) {
      this.$store.dispatch('getAllSystemBalances')
    }
  },
  watch: {
    tab () {
      this.filter = ''
    }
  },
  computed: {
    env () {
      return process.env.NODE_ENV
    },
    isMeasurementMetric () {
      return !!this.$store.getters.isMeasurementMetric
    },
    balances () {
      return this.$store.getters.systemBalances
    }
  },
  methods: {
    showEditEeiDialog (item = {}) {
      this.eeiDialog = true
      this.eeiInEdit = item
      this.isRecreate = false
    },
    showRecreateEeiDialog (item = {}) {
      this.eeiDialog = true
      this.eeiInEdit = item
      this.isRecreate = true
    },
    async getEeiStatus (item) {
      const {status, itn, message} = await this.$store.dispatch('getEeiStatus', item)
      let idx = this.eeiHistory.findIndex(eei => eei.requestId === item.requestId)
      if (idx !== -1) {
        let newItem = status === 'rejected' ? Object.assign(item, {
          message,
          status,
          createTime: this.eeiHistory[idx].createTime || null
        }) : Object.assign(item, {
          itn,
          status: status === 'success' ? 'ready' : status,
          createTime: this.eeiHistory[idx].createTime || null
        })
        this.$set(this.eeiHistory, idx, newItem)
      }
    },
    updateLabelStatus (rtnArray) {
      rtnArray.sort((a, b) => b._key < a._key ? -1 : 1)
      this.labels = [...rtnArray, ...this.labels]
    },
    async cancelEei (item) {
      if (!confirm('Are you sure to cancel this EEI?')) return 'done'
      await this.$store.dispatch('cancelEei', item)
        .catch(e => {
          console.log(e.message)
          this.$store.dispatch('showToast', {info: e.message, level: 'error'})
          throw e
        })
      this.$set(item, 'status', 'canceled')
    },
    onProcessEei (item) {
      const {res, requestId} = item
      const {status, message, itn} = res
      let index = this.eeiHistory.findIndex(eei => eei.requestId === requestId)
      if (index !== -1) {
        this.$set(this.eeiHistory, index, Object.assign(item, {
          itn: status === 'success' ? itn : message,
          status: status === 'success' ? 'ready' : status,
          createTime: this.eeiHistory[index].createTime || null
        }))
      } else {
        this.eeiHistory.unshift({
          ...item,
          createTime: new Date()
        })
      }
    }
  }
}
</script>

<style scoped>
  .flash_alert{
    background-color: inherit !important;
    color: red;
    border: 0px;
  }

  .fontRed {
    color: red;
  }

  .fontGreen {
    color: green;
  }
</style>
