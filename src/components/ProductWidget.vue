<template>
  <div class="product-widget">
    <v-layout justify-space-between align-center>
      <v-flex>
        <v-layout justify-space-between align-center>
          <v-flex class="body-2 long-item">{{condition && (condition.toUpperCase() + ' - ')}}{{name}}</v-flex>
          <slot name="btn"></slot>
        </v-layout>
        <v-layout v-if="asin && asin.length !== 0" justify-start wrap align-start>
          <span>ASIN: </span>
          <span v-for="item in asin" column :key="item" class="ml-2">
            <a :href="`https://www.amazon.com/gp/product/${item}`" target='_blank'>{{item}}</a>
          </span>
        </v-layout>
        <v-layout v-if="sku && sku.length !== 0 && isOrganization" justify-start wrap align-start>
          <span>SKU: </span>
          <slot name="sku">
            <span v-for="item in sku" :key="item">
              <v-tooltip top v-if="approvedSkuMap[item] && approvedSkuMap[item].length">
                <template v-slot:activator="tooltip">
                  <strong v-on="tooltip.on" class="ml-2">
                    {{item}}
                  </strong>
                </template>
                Approved by: <div v-for="warehouseKey in approvedSkuMap[item]" :key="warehouseKey">{{ warehouseKeyToNameMap[warehouseKey] }}</div>
              </v-tooltip>
              <div class="ml-2" v-else>{{item}}</div>
            </span>
          </slot>
        </v-layout>
        <v-layout wrap justify-start>
          <v-flex sm4 md3 class="text-sm-left" v-if="price">$ {{price}}</v-flex>
          <span class="text-sm-left" v-if="upc">UPC: {{ $slots.upc ? '' : upc }} <slot name="upc"></slot></span>
        </v-layout>
        <v-layout wrap justify-start v-if="quantityPurchased !== undefined">
          <v-flex class="text-sm-left">Purchased Qty: {{quantityPurchased}}</v-flex>
        </v-layout>
        <v-layout wrap justify-start v-if="quantityShipped !== undefined">
          <v-flex class="text-sm-left">Shipped Qty: {{quantityShipped}}</v-flex>
        </v-layout>
        <v-layout wrap justify-start v-if="orderId">
          <v-flex class="text-sm-left">Order id: {{orderId}}</v-flex>
        </v-layout>
        <v-layout wrap v-if="note"><v-flex class="long-item" :style="noteStyle" v-text="note" v-linkified></v-flex></v-layout>
      </v-flex>
      <v-flex sm1> {{' '}}</v-flex>
      <slot name="info"></slot>
    </v-layout>
  </div>
</template>

<script>
export default {
  name: 'productWidget',
  data () {
    return {}
  },
  computed: {
    noteStyle () {
      return 'overflow-wrap: break-word; white-space: pre-wrap;' + (this.$vuetify.breakpoint.smAndDown 
        ? 'max-width: 15vw;' 
        : (this.$vuetify.breakpoint.mdOnly 
          ? 'max-width: 20vw;' 
          : (this.$vuetify.breakpoint.lgOnly 
            ? 'max-width: 30vw;' 
            : 'max-width: 40vw;')))
    },
    isOrganization () {
      return this.$store.getters.activeOrganization
    },
    warehouseKeyToNameMap () {
      return this.$store.getters.warehouseKeyToNameMap
    },
    approvedSkuMap () {
      let map = {}
      this.$store.getters.productsWithUpcChangeableFlag.forEach(product => {
        let {approvedSkus = []} = product
        approvedSkus.forEach(sku => {
          let [warehouseKey, skuForDisplay] = sku.split('_')
          map[skuForDisplay] = map[skuForDisplay] || []
          map[skuForDisplay].push(warehouseKey)
        })
      })
      return map
    }
  },
  props: {
    name: String,
    condition: String,
    price: [Number, String],
    asin: Array,
    sku: Array,
    note: String,
    upc: String,
    quantityPurchased: Number,
    quantityShipped: Number,
    orderId: String,
    pickedUpcs: {
      type: Array,
      default: () => {
        return []
      }
    }
  }
}
</script>

<style>
.product-widget .long-item {
  max-width: 640px;
  overflow-wrap: break-word;
}
</style>
