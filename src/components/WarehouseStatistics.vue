<template>
  <v-container fluid>
    <v-layout>
      <v-flex sm6 md3 lg2>
        <v-select
          label="Site name"
          v-model="warehouseSite"
          :items="warehouseSites"
          item-text="siteName"
          item-value="key"></v-select>
      </v-flex>
      <v-flex md1></v-flex>
      <v-flex sm6 md3 lg2>
        <v-select
          label="Type"
          v-model="type"
          :items="types"
          item-text="name"
          item-value="key"></v-select>
      </v-flex>
      <v-flex md1>
        <LoaderButton
          :promiseAwait="refresh"
          :flat="true">
          <v-icon dark class="mx-2" slot="icon">refresh</v-icon>
        </LoaderButton>
      </v-flex>
    </v-layout>
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
          <v-layout v-if="index === 1 && tab === 1">
            <v-flex md2>
              <v-menu
                :close-on-content-click="false"
                v-model="startMenu"
                :nudge-right="40"
                lazy
                transition="scale-transition"
                offset-y
                full-width
                min-width="290px"
              >
                <template v-slot:activator="data">
                  <v-text-field
                    v-model="startDateString"
                    label="Start date"
                    prepend-icon="event"
                    readonly
                    v-on="data.on"
                  ></v-text-field>
                </template>
                <v-date-picker 
                  v-model="startDateString" 
                  @input="startMenu = false"
                  :min="tab === 1 ? (selectedStat[0] ? selectedStat[0].dateKeyStr : '') : ''"></v-date-picker>
              </v-menu>
            </v-flex>
            <v-flex md2>
              <v-menu
                :close-on-content-click="false"
                v-model="endMenu"
                :nudge-right="40"
                lazy
                transition="scale-transition"
                offset-y
                full-width
                min-width="290px"
              >
                <template v-slot:activator="data">
                  <v-text-field
                    v-model="endDateString"
                    label="End date"
                    prepend-icon="event"
                    readonly
                    v-on="data.on"
                  ></v-text-field>
                </template>
                <v-date-picker 
                  v-model="endDateString" 
                  @input="endMenu = false"
                  :min="tab === 1 ? (selectedStat[0] ? selectedStat[0].dateKeyStr : '') : ''"
                ></v-date-picker>
              </v-menu>
            </v-flex>
          </v-layout>
          <v-layout>
            <v-chart
              :options="option"
              :init-options="initOptions"
              ref="chart"
              theme="ovilia-green"
              autoresize
              class="price-chart"/>
          </v-layout>
        </v-tab-item>
      </v-tabs-items>
    </v-tabs>
  </v-container>
</template>

<script>
import ECharts from 'vue-echarts'
import 'echarts/lib/chart/line'
import 'echarts/lib/chart/bar'
import 'echarts/lib/component/legend'
import 'echarts/lib/component/title'
import 'echarts/lib/component/tooltip'
import LoaderButton from './LoaderButton'
import {timeTools} from '../utils/tools'

export default {
  name: 'WarehouseStatistics',
  components: {
    'v-chart': ECharts,
    LoaderButton
  },
  data () {
    return {
      tab: 0,
      tabs: ['Monthly', 'Daily'],
      initOptions: {
        renderer: 'canvas'
      },
      warehouseSite: '',
      type: 'inbound',
      types: [{name: 'Inbound', key: 'inbound'}, {name: 'Outbound', key: 'outbound'}],
      startDateString: this.toPickerDateString(new Date()),
      startMenu: false,
      endDateString: this.toPickerDateString(new Date()),
      endMenu: false
    }
  },
  mixins: [timeTools],
  beforeCreate () {
    this.$store.dispatch('getWarehouseStat')
  },
  mounted () {
    this.warehouseSite = this.warehouseSites[0] ? this.warehouseSites[0].key : ''
  },
  computed: {
    statistics () {
      return this.$store.getters.statistics
    },
    selectedStat () {
      if (!this.statistics[`${this.warehouseSite}_${this.type}`]) return []
      return this.statistics[`${this.warehouseSite}_${this.type}`][this.tab === 0 ? 'monthlyStat' : 'dailyStat']
    },
    selectedDailyStats () {
      return this.selectedStat.filter(item => (item.dateKeyStr <= this.endDateString) && (item.dateKeyStr >= this.startDateString))
    },
    warehouseSites () {
      return this.$store.getters.warehousesSites
    },
    source () {
      if (this.tab === 0) {
        return this.selectedStat.map(item => {
          let {monthKeyStr, units, packages, items} = item
          return this.type === 'inbound' ? [monthKeyStr, packages, items, units] : [monthKeyStr, packages, units]
        }) 
      } 
      return this.selectedDailyStats.map(item => {
        let {dateKeyStr, units, packages, items} = item
        return this.type === 'inbound' ? [dateKeyStr, packages, items, units] : [dateKeyStr, packages, units]
      })
    },
    option () {
      return {
        legend: {
          selected: {
            'packages': true, 
            'items': false, 
            'units': false
          }
        },
        tooltip: {},
        dataset: {
          source: [
            this.type === 'inbound' ? ['attrs', 'packages', 'items', 'units'] : ['attrs', 'packages', 'units'], 
            ...this.source]
        },
        xAxis: { type: 'category' },
        yAxis: {},
        series: this.type === 'inbound' ? [{ type: 'bar' }, { type: 'bar' }, { type: 'bar' }] : [{ type: 'bar' }, { type: 'bar' }]
      }
    }
  },
  methods: {
    refresh () {
      return this.$store.dispatch('getWarehouseStat')
    }
  }
}
</script>

<style>
  .echarts.price-chart {
    width: 100%;
    min-width: 600px;
    min-height: 400px;
  }
</style>
