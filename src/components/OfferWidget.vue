<template>
  <v-flex class="offer-widget my-2" style="min-width: 140px;">
    <v-layout warp><v-flex :class="`${titleClass} offer-title`">{{condition && condition.toUpperCase()}} - {{name}}</v-flex></v-layout>
    <v-layout warp><v-flex :class="`${noteClass} offer-note`" :style="{ 'white-space': 'pre-wrap' }" v-text="note" v-linkified></v-flex></v-layout>
    <v-layout v-if="isPropose">Ship to: {{shipTo}}</v-layout>
    <v-layout class="mt-3" wrap justify-start v-if="!isPropose">
      <v-flex sm4 md3 class="text-sm-left" v-if="isOrganization">
        <v-icon>people</v-icon>
        <span v-if="isPublic">{{"Visible to all members"}}</span>
        <span v-else>{{"Only visible to limited members"}}</span>
      </v-flex>
      <v-flex md4 class="text-sm-left"><v-icon>timer</v-icon>Valid: {{ toDateString(createTime) }} - {{ expirationDateString }}</v-flex>
      <v-flex md3 class="text-sm-left"><v-icon>timer</v-icon>Pending period: {{pendingPeriod}}</v-flex>
    </v-layout>
  </v-flex>
</template>

<script>
import {toDateString, timeTools} from '../utils/tools'

export default {
  name: 'OfferWidget',
  data () {
    return {}
  },
  mixins: [timeTools],
  computed: {
    expirationDateString () {
      return toDateString(this.expirationDate)
    },
    isOrganization () {
      return this.$store.getters.activeOrganization
    },
    titleClass () {
      return !this.isHistory && this.isExpired ? 'body-2 line-through' : 'body-2'
    }
  },
  props: {
    name: String,
    condition: String,
    price: Number,
    note: String,
    isPublic: Boolean,
    isPropose: Boolean,
    isExpired: Boolean,
    shipTo: String,
    noteClass: {
      type: String,
      default: ''
    },
    isHistory: Boolean,
    expirationDate: {
      type: Date,
      default: null
    },
    createTime: {
      type: [Date, Object],
      default: null
    },
    pendingPeriod: Number
  }
}
</script>

<style>
.line-through {
  text-decoration: line-through;
}
</style>
