<template>
  <v-container fluid>
    <PaginationController
      v-model="labels"
      getDataActionName="getLabelPagination"
      :historyLimit="historyLimit"
      :haveSearchBox="true"
      :select="(selectedBalanceTable || {}).clientKey"
      searchBoxLabel="Search"
      searchBoxHint="Memo/Recipient/Service type/Tracking/Type"
    >
      <template v-slot:dataTable>
        <v-data-table
          :headers="headers"
          :items="labels"
          hide-actions
          item-key="orderId"
        >
          <template v-slot:items="props">
            <td class="text-xs-left">
              <v-layout wrap v-if="props.item.orderId">
                <v-flex class="text-xs-left"><span class="font-weight-bold">ID:&nbsp; </span> {{ props.item._key }}</v-flex>
                <v-flex class="text-xs-right">[{{props.index + 1}}]</v-flex>
              </v-layout>
              <v-layout wrap v-if="props.item.shipmentId">
                <span class="font-weight-bold">Shipment ID:&nbsp; </span> {{ props.item.shipmentId }}
              </v-layout>
              <v-layout wrap v-if="props.item.itn">
                <span class="font-weight-bold">ITN:&nbsp; </span> {{ props.item.itn }}
              </v-layout>
              <v-layout wrap v-if="props.item.note" style="overflow-wrap: break-word; word-break: break-all;">
                <span class="font-weight-bold">Note:&nbsp; </span>{{ props.item.note }}
              </v-layout>
              <v-layout>
                <v-flex md6 v-if="props.item.packaging && JSON.stringify(props.item.packaging) !== '{}'">
                  <span class="font-weight-bold">Size(L/W/H): </span> {{displayPackaging(props.item.packages[0])}}
                </v-flex>
                <v-flex md1></v-flex>
                <v-flex md4 v-if="props.item.weight">
                  <span class="font-weight-bold">Weight: </span> {{ props.item.weight }}{{props.item.isMeasurementMetric ? 'kg' : 'lbs'}}
                </v-flex>
              </v-layout>
              <v-layout>
                <span class="font-weight-bold text-capitalize">Declared value:&nbsp; </span> {{ props.item.insuredValue }}
              </v-layout>
              <v-layout v-if="props.item.signature">
                <span class="font-weight-bold text-capitalize">Signature:&nbsp; </span> {{ props.item.signature }}
              </v-layout>
              <v-layout wrap v-if="props.item.memo">
                <span class="font-weight-bold">Memo:&nbsp; </span>{{ props.item.memo }}
              </v-layout>
              <v-layout wrap v-if="props.item.clientName">
                <span class="font-weight-bold">Client:&nbsp; </span>{{ props.item.clientName }}
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
            <td v-if="$store.getters.activeWarehouse" class="text-xs-left">
              {{ organizationKeyToId.get(props.item.clientKey) }}
            </td>
            <td class="text-xs-left">
              <v-layout>
                {{ toDateYYYYMMDDHHmm(props.item.createTime) }}
              </v-layout>
              <v-layout>
                {{ props.item.shipDate }}
              </v-layout>
              <v-layout v-if="props.item.estimatedDelivery && props.item.estimatedDelivery !== 'N/A'" class="text-capitalize">
                <v-flex v-if="typeof props.item.estimatedDelivery === 'string'">{{ 
                  toDateYYYYMMDDHHmm(new Date(props.item.estimatedDelivery)) 
                }}</v-flex>
                <v-flex v-else>{{ toDateYYYYMMDDHHmm(props.item.estimatedDelivery) }}</v-flex>
              </v-layout>
            </td>
            <td class="text-xs-left">
              <LabelTrackingDetailWidget 
                v-if="props.item.status !== 'failed'"
                :trackingNumber="props.item.trackingNumber"
                :status="props.item.status"
                :carrier="props.item.carrier"
                :details="props.item.trackingDetails"
              />
              <div v-else>
                <p :key="messageItem.time" v-for="messageItem in props.item.messages" >
                  {{messageItem.message}}
                </p>
              </div>
            </td>
            <td class="text-xs-left">{{ props.item.serviceDescription }}</td>
            <td :class="props.item.totalAmount ? 'text-xs-left fontRed' : (props.item.amount > 0 ? 'text-xs-left fontGreen' : 'text-xs-left fontRed')">
              ${{ -props.item.totalAmount || props.item.amount || 0 }}
            </td>
            <td class="text-xs-left">{{ props.item.status || 'ready' }}</td>
            <td class="text-xs-center">
              <v-layout row>
                <v-flex v-if="props.item.status === 'pending'">
                  <LoaderButton
                    flat
                    buttonText="Get status"
                    :promiseAwait="getLabelStatus"
                    :promiseItem="props.item"/>
                </v-flex>
                <v-flex v-else>
                  <v-btn 
                    dark 
                    flat 
                    color="primary" 
                    @click.stop="downloadFile(props.item.url, props.item.orderId)"
                    :disabled="!props.item.url"
                  >Label</v-btn>
                </v-flex>
              </v-layout>
            </td>
          </template>
        </v-data-table>
      </template>
      <template v-slot:beforeMenu>
        <v-layout row wrap justify-space-between>
          <v-flex md6>
            <v-autocomplete
              label="Select org"
              v-model="selectedBalanceTable"
              return-object
              item-text="clientName"
              :items="balances"
              clearable></v-autocomplete>
          </v-flex>
          <v-flex md3>
            <v-btn :loading="loading" color="primary" dark @click="loading ||((loading = true) && updateTrackings())"
            >Update Tracking</v-btn>          
          </v-flex>
        </v-layout>
      </template>
    </PaginationController>
  </v-container>
</template>

<script>
import Label from './Label'

export default {
  name: 'LabelAdmin',
  extends: Label,
  data () {
    return {
      selectedBalance: {},
      selectedBalanceTable: {},
      headers: [
        { text: 'Details', value: 'signature', align: 'left', sortable: false },
        { text: 'From', value: 'from', align: 'left', sortable: false },
        { text: 'To', value: 'to', align: 'left', sortable: false },
        { text: 'Create/Ship date', value: 'createTime', align: 'left', sortable: false },
        { text: 'Tracking/Info', value: 'trackingNumber', align: 'left', sortable: false },
        { text: 'Service', value: 'shippingService', align: 'left', sortable: false },
        { text: 'Amount', value: 'amount', align: 'left', sortable: false },
        { text: 'Status', value: 'status', align: 'left', sortable: false },
        { text: 'Actions', value: '', align: 'center', sortable: false }
      ],
      labels: [],
      loading: false
    }
  },
  async created () {
    this.$store.dispatch('getAllSystemBalances')
    this.$store.dispatch('loadSystemInfo')
  },
  destroyed () {
    this.$store.getters.subscribed['systemSetting']()
  },
  computed: {
    balances () {
      return this.$store.getters.systemBalances
    },
    fullBetaFeatures () {
      return this.$store.getters.fullBetaFeatures
    }
  },
  watch: {
    balances (value) {
      this.selectedBalanceTable = value.find(item => item.clientKey === this.selectedBalanceTable.clientKey) || {}
    }
  },
  methods: {
    updateTrackings () {
      return this.$store.dispatch('updateLabelStatus')
        .catch(e => { console.log(e); alert('sth broke, watch the console') })
        .finally(() => (this.loading = false))
    },
    displayPackaging (packaging) {
      let {length, width, height, isMeasurementMetric, originLength, originWidth, originHeight} = packaging || {}
      return isMeasurementMetric ? `${originLength || length}cm/${originWidth || width}cm/${originHeight || height}cm` : `${originLength || length}"/${originWidth || width}"/${originHeight || height}"`
    }
  }
}
</script>
