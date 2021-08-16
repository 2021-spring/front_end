<template>
  <div class="product-widget">
    <v-layout v-if="orderId" justify-start wrap align-start>
      <span>Order id: {{ orderId }}</span>
        <v-icon 
          color="info"
          small 
          @click.stop="showErrorPopup" 
          v-if="messages && messages.length"
        >info</v-icon>
    </v-layout>
    <v-layout v-if="buyerName" justify-start wrap align-start>
      <span>Buyer name: {{ buyerName }}</span>
    </v-layout>
    <v-layout v-if="platform" justify-start wrap align-start>
      <span>Platform: {{ platform }}</span>
    </v-layout>
    <LabelErrorPopup v-if="messages && messages.length" v-model="errorPop" :messages="messages || []" />
  </div>
</template>

<script>
import LabelErrorPopup from '@/components/LabelErrorPopup'

export default {
  name: 'OrderDetail',
  components: {LabelErrorPopup},
  data () {
    return {
      errorPop: false
    }
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
    }
  },
  methods: {
    showErrorPopup () {
      this.errorPop = true
    }
  },
  props: {
    orderId: String,
    buyerName: String,
    platform: String,
    messages: Array
  }
}
</script>

<style>
.product-widget .long-item {
  max-width: 640px;
  overflow-wrap: break-word;
}
</style>
