<template>
  <v-container fluid>
    <v-layout justify-space-between align-baseline>
      <v-flex sm6 md3 lg2>
        <v-select
          label="Site name"
          v-model="warehouseSite"
          :items="warehouseSites"
          item-text="siteName"
          item-value="key"></v-select>
      </v-flex>
      <v-flex sm6 md3 lg2>
        <v-menu
          ref="datePicker"
          lazy
          :close-on-content-click="false"
          v-model="datePicker"
          transition="scale-transition"
          offset-y
          full-width
          :nudge-right="40"
          min-width="290px"
        >
          <template v-slot:activator="{ on }">
            <v-text-field
              label="Date"
              v-model="date"
              prepend-icon="event"
              v-on="on"
              readonly
            ></v-text-field>
          </template>
          <v-date-picker v-model="date" @input="datePicker = false"></v-date-picker>
        </v-menu>
      </v-flex>
      <v-flex sm6 md3 lg2>
        <LoaderButton
          buttonText="Stow"
          :promiseAwait="finishUpcStow"/>
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
    <WarehouseStowTable
      ref="table"
      :upcToQtyMap="dailyInboundMap"
      :siteKey="warehouseSite"
      type="stow"
      :filter="filter"/>
  </v-container>
</template>

<script>
import WarehouseStowTable from './WarehouseStowTable'
import LoaderButton from './LoaderButton'
import { timeTools, getCurDateKeyStr } from '@/utils/tools'

export default {
  name: 'WarehouseStow',
  components: {
    WarehouseStowTable,
    LoaderButton
  },
  data () {
    return {
      warehouseSite: '',
      filter: '',
      datePicker: false,
      date: getCurDateKeyStr()
    }
  },
  mixins: [
    timeTools
  ],
  mounted () {
    this.warehouseSite = this.warehouseSites[0] ? this.warehouseSites[0].key : ''
  },
  computed: {
    warehouseSites () {
      return this.$store.getters.warehousesSites
    },
    dailyInboundMap () {
      return this.$store.getters.dailyInboundMap
    }
  },
  watch: {
    async warehouseSite (siteKey, prevSiteKey) {
      if (prevSiteKey) {
        await this.$store.dispatch('unsubscribeDailyInbound')
      }
      if (siteKey && this.date) {
        this.$store.dispatch('getDailyInboundRT', {siteKey, dateString: this.date})
      }
    },
    async date (date) {
      if (this.warehouseSite) {
        await this.$store.dispatch('unsubscribeDailyInbound')
      }
      if (this.warehouseSite && date) {
        this.$store.dispatch('getDailyInboundRT', {siteKey: this.warehouseSite, dateString: date})
      }
    }
  },
  methods: {
    refresh () {
      return this.$store.dispatch('getWarehouseStat')
    },
    finishUpcStow () {
      if (!confirm('Are you sure to finish the selected upcs?')) return Promise.resolve()

      return this.$store.dispatch('finishUpcStow', {
        dateKeyStr: this.date,
        stowMap: this.$refs.table.stowMap, 
        siteKey: this.warehouseSite
      })
        .then(() => {
          this.$refs.table.selectedUpcs = []
        })
        .catch((error) => {
          this.$store.dispatch('showToast', {info: error.message, level: 'error'})
          throw error
        })
    }
  }
}
</script>
