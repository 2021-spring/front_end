<template>
  <v-container fluid>
    <v-layout>
      <v-chart
        :options="option"
        :init-options="initOptions"
        theme="ovilia-green"
        autoresize
        class="price-chart"/>
    </v-layout>
    <v-layout row wrap align-center>
      <v-flex offset-xs1>
        <v-checkbox label="Split line" v-model="splitLineToggle" />
      </v-flex>
      <v-spacer></v-spacer>
      <p>* The history data will be updated twice a day</p>
      <v-flex xs1 />
    </v-layout>
  </v-container>
</template>

<script>
import ECharts from 'vue-echarts'
import 'echarts/lib/chart/line'
import 'echarts/lib/chart/bar'
import 'echarts/lib/component/legend'
import 'echarts/lib/component/title'
import 'echarts/lib/component/tooltip'
import 'echarts/lib/component/dataZoom'
import LoaderButton from './LoaderButton'
import {timeTools, toMoney} from '../utils/tools'

export default {
  name: 'ProductPriceHistory',
  components: {
    'v-chart': ECharts,
    LoaderButton
  },
  data () {
    return {
      initOptions: {
        renderer: 'canvas'
      },
      splitLineToggle: true
    }
  },
  mounted () {
    this.$store.dispatch('getProductPriceHistory', {productId: this.value})
  },
  mixins: [timeTools],
  computed: {
    priceHistories () {
      return this.$store.getters.priceHistories
    },
    currentPriceHistory () {
      return this.priceHistories.find(item => item.productId === this.value)
    },
    startValue () {
      return this.source.length - 20
    },
    option () {
      return {
        legend: {bottom: 5},
        tooltip: {
          trigger: 'axis',
          axisPointer: {
            type: 'cross'
          },
          backgroundColor: 'rgba(245, 245, 245, 0.8)',
          borderWidth: 1,
          borderColor: '#ccc',
          padding: 10,
          textStyle: { color: '#000' },
          extraCssText: 'width: 170px'
        },
        dataZoom: [{
          type: 'inside',
          filterMode: 'filter',
          maxValueSpan: 100,
          minValueSpan: 5,
          startValue: this.startValue,
          zoomOnMouseWheel: true,
          moveOnMouseWheel: false
        }],
        dataset: {
          source: [
            ['attrs', 'price', 'quantity'],
            ...this.source
          ]
        },
        brush: {xAxisIndex: 'all', brushLink: 'all', outOfBrush: {colorAlpha: 0.1}},
        axisPointer: {link: {xAxisIndex: 'all'}, label: {backgroundColor: '#777'}},
        xAxis: [
          { 
            scale: true,
            type: 'category',
            axisPointer: { z: 100 },
            min: 'dataMin',
            max: 'dataMax'
          }
        ],
        yAxis: [
          { 
            name: 'price ($)',
            min: v => v.min > 5 ? v.min - 5 : 0,
            max: v => v.max + 5,
            splitLine: {
              show: this.splitLineToggle,
              lineStyle: { type: 'solid' }
            }
          },
          { 
            name: 'quantity',
            min: v => v.min > 10 ? v.min - 10 : 0, 
            max: v => v.max + 10,
            splitLine: {
              show: this.splitLineToggle,
              lineStyle: { color: '#75b4f3', type: 'dashed' }
            }
          }
        ],
        series: [
          {name: 'price', type: 'line'},
          {
            name: 'quantity',
            type: 'bar',
            yAxisIndex: 1,
            barMaxWidth: 30,
            itemStyle: {
              color: '#d3e7fb'
            }
          }
        ]
      }
    },
    source () {
      let lastAttr = {name: '', index: 0}
      return ((this.currentPriceHistory || {}).inbound || [])
        .sort((a, b) => a.dateTime - b.dateTime)
        .reduce((preVal, curVal) => {
          const {price, dateTime, bonus = 0, quantity = 0} = curVal
          let attr = this.toDateString(dateTime)
          const money = toMoney(price + bonus)
          let idx = preVal.findIndex(item => item[0].startsWith(attr) && item[1] === money)
          if (idx >= 0) {
            preVal[idx][2] += quantity
            return preVal
          }
          if (lastAttr.name === attr) attr += ('-' + (lastAttr.index += 1))
          else lastAttr = {name: attr, index: 0}
          return [...preVal, [attr, money, quantity]]
        }, [])
    }
  },
  props: {
    value: String // productId
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
