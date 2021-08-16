<template>
  <v-menu v-model="display" :close-on-content-click="false" offset-y>
    <template v-slot:activator="{ on }">
      <span v-if="!trackingNumber || !details || !details.length">
        <slot />
        <span v-if="!$slots.default">{{tracking}}</span>
      </span>
      <a v-else linkify v-on="on">
        <slot />
        <span v-if="!$slots.default">{{tracking}}</span>
      </a>
    </template>
    
    <v-card>
      <v-card-text>
        <v-data-table
          :headers="[
            { text: 'Time', align: 'left', sortable: false, value: 'timestamp' },
            { text: 'Event', align: 'left', sortable: false, value: 'desc' },
            { text: 'Address', align: 'left', sortable: false, value: 'address'}
          ]"
          :items="details"
          item-key="serviceType"
          hide-actions
        >
          <template v-slot:items="{ item }">
            <td>{{item.timestamp && new Date(item.timestamp).toLocaleString()}}</td>
            <td>{{item.desc}}</td>
            <td>{{item.address}}</td>
          </template>
          <template slot="no-data">
            <v-flex row wrap text-xs-center>
              No events of this tracking
            </v-flex>
          </template>
        </v-data-table>
      </v-card-text>
      <v-card-actions>
        <a v-if="carrier" linkify @click="trackOnCarrierSite">Track {{tracking}} on carrier's site</a>
        <v-spacer></v-spacer>
        <v-btn color="primary" flat @click="display = false">Close</v-btn>
      </v-card-actions>
    </v-card>
  </v-menu>
</template>

<script>
export default {
  name: 'LabelTrackingDetailWidget',
  data () {
    return {
      display: false
    }
  },
  computed: {
    tracking () {
      return this.trackingNumber || (this.$slots.default && this.$slots.details.text) || ''
    }
  },
  methods: {
    trackOnCarrierSite () {
      const sites = {
        usps: 'https://tools.usps.com/go/TrackConfirmAction?tRef=fullpage&tLc=2&text28777=&tLabels=' + this.tracking,
        fedex: `https://www.fedex.com/fedextrack/?trknbr=${this.tracking}` 
      }
      window.open(sites[this.carrier.toLowerCase()])
    }
  },
  props: {
    trackingNumber: String,
    status: String,
    carrier: String,
    details: {
      type: Array,
      default: () => [] // data like: {timestamp, status, desc, address}
    }
  }
}
</script>
