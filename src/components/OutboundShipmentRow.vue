<template>
  <tr @click="$emit('update:expanded', !expanded)">
    <td v-if="isWarehouse && type === 'active'" @click.stop="props.selected = !props.selected">
      <v-checkbox
        :input-value="props.selected"
        primary
        hide-details
      ></v-checkbox>
    </td>
    <td class="text-xs-left" style="white-space: nowrap;">
      <v-layout v-if="isOrganization"><strong>User:&nbsp;</strong>{{ item.userName}}</v-layout>
      <v-layout v-else><strong>Org:&nbsp;</strong>{{ getOrgId(item.tenantKey) + ` (${item.tenantName})` }}</v-layout>
      <v-layout><strong>ID:&nbsp;</strong>{{ item._key }}</v-layout>
      <v-layout v-if="isOrganization && type === 'active'"><strong>Type:&nbsp;</strong>{{ item.isDraft ? 'Draft' : 'Shipment' }}</v-layout>
      <v-layout v-if="(isOrganization || isWarehouse) && siteName"><strong>Site:&nbsp;</strong>{{ siteName }}</v-layout>
    </td>
    <td class="text-xs-left">{{ item.isExpedited ? 'Expedited' : 'Normal' }}</td>
    <td class="text-xs-left">
      <v-layout 
        v-for="(item, index) in item.products" 
        :key="'item' + index"
      >
        <v-flex xs12>
          <ProductWidget
            :name="getUpcName(item)"
            :condition="item.condition"
            :upc="item.upc"
            :pickedUpcs="pickedUpcs"
            :asin="isOrganization ? item.asin : null"
            :orderId="isWarehouse ? null : item.relatedOrder"
          >
            <template v-slot:info>
              <v-flex class="text-xs-right" style="white-space: nowrap">{{ item.toShip }}<div style="display: inline-block; width: 18px"><v-icon small v-if="type === 'active' && pickedUpcs.includes(item.upc)">pan_tool</v-icon></div></v-flex>
            </template>  
            <template v-slot:upc>
              <span class="ml-2"><a @click.stop="$emit('clickUpc', item.upc)">{{item.upc}}</a></span>
            </template>
          </ProductWidget>
        </v-flex> 
      </v-layout>

      <v-layout
        v-if="item.otherServices && item.otherServices.length"
        >
        <span>Other services:</span>
        <v-chip 
          v-for="service in item.otherServices"
          :key="service.value"
          class="text-capitalize"
          >{{service}}</v-chip>
      </v-layout>
      <v-layout
        v-if="item.warehouseNote && item.warehouseNote.length"
        >
        <v-layout column>
          <div><b>Warehouse note:</b></div>
          <div style="whiteSpace: pre-wrap; overflow-wrap: break-word; max-width: 30vw;">{{item.warehouseNote}}</div>
        </v-layout>
      </v-layout>
    </td>
    <td class="text-xs-left" v-if="isOrganization"><div class="shipment-id">{{ item.shipmentId}}</div></td>
    <td class="text-xs-left"><div class="shipment-id">{{ item.trackingNum}}</div></td>
    <td class="text-xs-center">{{ item.packageQty }}</td>
    <td class="text-xs-left" v-if="isOrganization">{{ item.destination && ((item.destination.name === '-- Other --') ? item.destination.content : item.destination.name) }}</td>
    <td class="text-xs-left">{{ toTimestampString(item.createTime) }}</td>
    <td v-if="type === 'active'">
      <v-layout justify-center wrap>
        <v-btn color="primary" flat @click.stop="getShipmentLabel(item)" :disabled="!item.zipFile">Label</v-btn>
        <v-tooltip top>
          <template v-slot:activator="tooltip">
            <div v-on="tooltip.on">
              <v-badge :value="checkNewComment(item)" color="red" overlap v-if="isOrganization">
                <template v-slot:badge>
                  <span class="badge">New</span>
                </template>
                <v-btn 
                  color="primary" 
                  flat 
                  @click.stop="$emit('show-comments-active', item)" 
                >Internal</v-btn>
              </v-badge>
            </div>
          </template>
          Only visible to organizations
        </v-tooltip>
        <LoaderButton
          v-if="isOrganization"
          buttonText="Cancel"
          color="secondary"
          :promiseAwait="cancelShipment"
          :promiseItem="item"
          :flat="true"/>
        <v-btn 
          color="primary" 
          v-if="!isOrganization || item.userKey === $store.getters.activeOrganization"
          flat 
          @click.stop="$emit('show-confirm-dialog', item)">Confirm</v-btn>
      </v-layout>
    </td>
    <td v-if="type === 'history'" class="text-xs-center">
      <v-btn 
        color="primary" 
        flat 
        @click.stop="$emit('show-details', item)">Details</v-btn>
      <v-tooltip top>
        <template v-slot:activator="tooltip">
          <div v-on="tooltip.on">
            <v-btn 
              color="primary" 
              flat 
              @click.stop="$emit('show-comments-history', item)" 
              v-if="isOrganization">Internal</v-btn>
          </div>
        </template>
        Only visible to organizations
      </v-tooltip>
    </td>
  </tr>
</template>

<script>
import LoaderButton from './LoaderButton'
import ProductWidget from './ProductWidget'
import {timeTools} from '@/utils/tools'

export default {
  name: 'OutboundShipmentRow',
  components: {
    LoaderButton,
    ProductWidget
  },
  mixins: [timeTools],
  data () {
    return {
      
    }
  },
  watch: {
    
  },
  computed: {
    isOrganization () {
      return !!this.$store.getters.activeOrganization
    },
    isWarehouse () {
      return !!this.$store.getters.activeWarehouse
    },
    organizationKeyToId () {
      return this.$store.getters.organizationKeyToId
    }
  },
  methods: {
    getOrgId (tenantKey = '') {
      return this.organizationKeyToId.get(tenantKey) || ''
    },
    getUpcName (product) {
      const {name, upc} = product
      if (this.isWarehouse) return this.$store.getters.getUpcName(upc)
      return name
    },
    getShipmentLabel (item) {
      item.zipFile && this.$store.dispatch('downloadFile', {fullPath: item.zipFile, name: 'label.zip'})
    },
    cancelShipment (item) {
      if (confirm((item.labels && item.labels.length > 0) ? 'Are you sure to cancel this shipment? Note: The label won’t be canceled. It can still be download in label page.' : 'Are you sure to cancel this shipment?')) {
        return this.$store.dispatch('cancelShipment', item)
      }
      return Promise.resolve()
    },
    checkNewComment (request) {
      let lastReadTime = request[`lastRead_draftComments_${this.$store.getters.uid}`]
      let hasOnlyInitialComment = request.draftComments && request.draftComments.length === 1 && request.draftComments[0].initialComment
      let lastMessageTime = request.draftComments && request.draftComments.length > 0 && request.draftComments.slice(-1)[0].createTime
      return !hasOnlyInitialComment && !!lastMessageTime && (!lastReadTime || lastReadTime < lastMessageTime)
    }
  },
  props: {
    props: Object,
    item: Object,
    expanded: Boolean,
    type: String,
    siteName: String,
    pickedUpcs: Array
  }
}
</script>

<style>
.thinBox .input-group__input {
  border: 1px solid rgba(0,0,0,.54) !important;
}
.text-capitalize .v-chip__content {
  text-transform: capitalize !important;
}
.shipment-id {
  max-width: 220px;
  overflow-wrap: break-word;
}

.outbound.confirm .v-input--selection-controls {
  margin-top: 0px !important;
}
.outbound.confirm .container {
  padding: 0px 12px !important;
}

.badge {
  font-size: 10px;
}
</style>
