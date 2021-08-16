<template>
  <v-container fluid>
    <InboundUpc 
      v-if="!isSkuMode"
      v-model="items"
    >
      <v-flex xs6 sm2 md2 v-if="activateSkuMode">
        <v-checkbox label="SKU mode" v-model="isSkuMode" :disabled="hasItems"></v-checkbox>
      </v-flex>
    </InboundUpc>
    <InboundSku 
      v-else
      v-model="items"
    >
      <v-flex xs6 sm2 md2 v-if="activateSkuMode">
        <v-checkbox label="SKU mode" v-model="isSkuMode" :disabled="hasItems"></v-checkbox>
      </v-flex>
    </InboundSku>
  </v-container>
</template>

<script>
import InboundUpc from './InboundUpc'
import InboundSku from './InboundSku'

export default {
  name: 'Inbound',
  components: {
    InboundUpc,
    InboundSku
  },
  data () {
    return {
      isSkuMode: false,
      items: []
    }
  },
  mounted () {
    this.isSkuMode = this.activateSkuMode ? window.localStorage.getItem('isSkuMode') === 'true' : false
  },
  watch: {
    isSkuMode (val) {
      window.localStorage.setItem('isSkuMode', val)
    }
  },
  computed: {
    hasItems () {
      return !!this.items.length
    },
    activateSkuMode () {
      return this.$store.getters.activateSkuMode
    }
  },
  methods: {

  }
}
</script>
