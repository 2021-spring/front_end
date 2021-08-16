<template>
  <v-container fluid>
    <v-layout 
      align-center 
      justify-center
      style="height: 400px;"
      v-if="warehouses.length < 1">
      <v-flex
        sm6 
        style="font-size: 2em"
        text-sm-center>
        There is no preferred warehouse service linked yet. You can signup the warehouse service in 
          <strong><router-link to="WarehouseSite">
            Warehouse -> Sites
          </router-link></strong>
           page          
      </v-flex>
    </v-layout>
    <template v-else>
      <v-layout>
        <v-flex xs6 md3 lg2 class="headline">
          <v-select
            :items="warehouses"
            label="Select vendor"
            item-text="warehouseName"
            return-object
            v-model="currentWarehouse"></v-select>
        </v-flex>
      </v-layout>
      <v-layout row justify-space-around>
        <v-flex sm10 md8 lg5 xl4>
          <v-card>
            <v-card-text>
              <v-layout justify-space-around align-center>
                <v-flex class="title" sm8 md5>
                  <v-layout>
                    <v-flex md4>Balance:</v-flex>
                    <v-flex md1></v-flex>
                    <v-flex class="title" md7> $ {{ (currentWarehouse && currentWarehouse.balance && currentWarehouse.balance.toLocaleString()) || 0 }}</v-flex>           
                  </v-layout>
                  <v-layout class="mt-2 caption" v-if="!isWarehouse && currentWarehouse.lowestBalance < 0">
                    Credit Line: &nbsp;${{ (-currentWarehouse.lowestBalance).toLocaleString() }}
                  </v-layout>
                  <v-layout class="mt-2 caption" v-if="!isWarehouse && JSON.stringify(discount) !== '{}'">
                    VIP Discount: &nbsp;
                    <span class="text-capitalize">
                      {{discount.name}}&nbsp;({{ discount.discountRate }}%)
                    </span>
                  </v-layout>
                </v-flex>
                <v-flex sm2 md3><v-btn dark large color="primary" @click.stop="showOnlinePaymentDialog">Deposit</v-btn></v-flex>
              </v-layout>
              <v-layout justify-space-around align-center>
                <v-flex sm8 md5>
                  <div v-if="isCurrentWarehouseLowBalance" class="flash_alert">
                    <v-layout align-center><v-icon color="red">info</v-icon><span>Low balance</span></v-layout>
                  </div>
                </v-flex>
                <v-flex sm2 md3></v-flex>
              </v-layout>
            </v-card-text>
          </v-card>
        </v-flex>
      </v-layout>
      <BillingTransactionTable
        class="mt-3"
        ref="billingTable"
        :warehouseKey="currentWarehouse && currentWarehouse.warehouseKey"/>
      <OnlinePaymentWidget
        v-model="onlinePaymentDialog" 
        v-if="onlinePaymentDialog"
        :currentWarehouse="currentWarehouse"
        @change="paymentChanged"/>
      <LabelPaymentWidget
        v-model="paymentDialog" 
        v-if="paymentDialog"
        :currentWarehouse="currentWarehouse"/>
    </template>
  </v-container>
</template>

<script>
import BillingTransactionTable from './BillingTransactionTable'
import OnlinePaymentWidget from './OnlinePaymentWidget'
import LabelPaymentWidget from './LabelPaymentWidget'

export default {
  name: 'BillingClient',
  components: {
    BillingTransactionTable,
    OnlinePaymentWidget,
    LabelPaymentWidget
  },
  data () {
    return {
      onlinePaymentDialog: false,
      organizations: [],
      currentWarehouse: {},
      isUserCurrentWarehouseLowBalance: false,
      isUserCurrentWarehouseHasBalance: false,
      warehouseTransactions: [],
      historyLimit: 25,
      transactionDetailDialog: false,
      transactionInEdit: {},
      paymentDialog: false,
      discount: {}
    }
  },
  beforeMount () {
    if (this.warehouses && this.warehouses.length) this.currentWarehouse = this.warehouses[0]
  },
  watch: {
    warehouses (curWarehouses, oldWarehouses) {
      if (!this.currentWarehouse.warehouseKey) {
        if (this.warehouses && this.warehouses.length) {
          this.currentWarehouse = this.warehouses[0]
        }
      } else {
        this.currentWarehouse = this.warehouses.find(warehouse => warehouse.warehouseKey === this.currentWarehouse.warehouseKey) || this.currentWarehouse
      }
    },
    currentWarehouse: {
      handler: async function (afterValue = {}, beforeValue = {}) {
        if (afterValue.warehouseKey !== beforeValue.warehouseKey) {
          this.$nextTick(() => {
            this.searchHistory()
          })
        }
        this.discount = (!this.isWarehouse && afterValue.warehouseKey && afterValue.warehouseKey !== 'system') ?
          ((await this.$store.dispatch('getTenantDiscount', {warehouseKey: afterValue.warehouseKey})) || {}) :
          {}
      },
      immediate: true
    }
  },
  computed: {
    warehouses () { 
      const {lowestBalance} = this.$store.getters.systemBalance
      const system = {
        ...this.$store.getters.systemBalance,
        warehouseName: 'Vite USA',
        criticalLowBalanceThreshold: lowestBalance,
        warehouseKey: 'system'
      }
      return [system, ...this.$store.getters.warehousesWithBalanceAndThreshold]
    },
    isCurrentWarehouseLowBalance () {
      let {balance, lowBalanceWarningThreshold} = this.currentWarehouse
      return balance <= lowBalanceWarningThreshold
    },
    isWarehouse () {
      return this.$store.getters.activeWarehouse
    }
  },
  methods: {
    showTransactionDetail (item) {
      this.transactionInEdit = item
      this.transactionDetailDialog = true
    },
    showOnlinePaymentDialog () {
      if (this.currentWarehouse.warehouseKey === 'system') {
        this.paymentDialog = true
      } else {
        this.onlinePaymentDialog = true
      }
    },
    searchHistory () {
      this.$refs.billingTable.$$refresh()
    },
    paymentChanged (value) {
      if (value) {
        this.searchHistory()
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
  .subheading {
    white-space: nowrap;
  }
</style>
