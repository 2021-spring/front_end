<template>
  <tr @click="$emit('update:expanded', !expanded)">
    <td class="text-xs-left" style="white-space: nowrap;">
      <v-layout><strong>User:&nbsp;</strong>{{ item.user.userName}}</v-layout>
      <v-layout><strong>ID:&nbsp;</strong>{{ item.requestId }}</v-layout>
      <v-layout v-if="isOrganization && type !== 'history'"><strong>Type:&nbsp;</strong>{{ item.isDraft ? 'Draft' : 'Shipment' }}</v-layout>
      <v-layout v-if="(isOrganization || isWarehouse) && siteName"><strong>Site:&nbsp;</strong>{{ siteName }}</v-layout>
    </td>
    <td class="text-xs-left">{{ item.isExpedited ? 'Expedited' : 'Normal' }}</td>
    <td class="text-xs-left">
      <v-flex 
        xs12
        row
        v-for="(item, index) in item.products" 
        :key="'item' + index">
        <ProductWidget
          :name="getUpcName(item)"
          :condition="item.condition"
          :upc="item.upc"
          :asin="isOrganization ? item.asin : null"
          :orderId="isWarehouse ? null : item.relatedOrder"
        >
          <template v-slot:info>
            <v-flex class="text-xs-right" style="white-space: nowrap">{{ item.toShip }}<div style="display: inline-block; width: 18px"></div></v-flex>
          </template>  
          <template v-slot:upc>
            <span class="ml-2"><a @click.stop="$emit('clickUpc', item.upc)">{{item.upc}}</a></span>
          </template>
        </ProductWidget>
      </v-flex> 
      <v-flex
        v-if="item.otherServices && item.otherServices.length"
        >
        <span>Other services:</span>
        <v-chip 
          v-for="service in item.otherServices"
          :key="service.value"
          class="text-capitalize"
          >{{service}}</v-chip>
      </v-flex>
    </td>
    <td class="text-xs-left" v-if="isOrganization"><div class="shipment-id">{{ item.shipmentId}}</div></td>
    <td class="text-xs-left"><div class="shipment-id">{{ item.trackingNum}}</div></td>
    <td class="text-xs-center">{{ item.packageQty }}</td>
    <td class="text-xs-left" v-if="isOrganization">{{ item.destination && ((item.destination.name === '-- Other --') ? item.destination.content : item.destination.name) }}</td>
    <td class="text-xs-left">{{ toTimestampString(item.createTime) }}</td>
    <td>
      <v-layout justify-center wrap>
        <v-btn color="primary" flat @click.stop="editDraft(item)">Edit</v-btn>
        <v-tooltip top>
          <template v-slot:activator="tooltip">
            <div v-on="tooltip.on">
              <v-badge :value="checkNewComment(item)" color="red" overlap>
                <template v-slot:badge>
                  <span class="badge">New</span>
                </template>
                <v-btn color="primary" flat @click.stop="$emit('show-comments', item)">Internal</v-btn>
              </v-badge>
            </div>
          </template>
          Only visible to organizations
        </v-tooltip>
        <LoaderButton
          buttonText="Cancel"
          color="secondary"
          :promiseAwait="cancelDraft"
          :promiseItem="item"
          :flat="true"/>
      </v-layout>
    </td>
  </tr>
</template>

<script>
import OutboundShipmentRow from './OutboundShipmentRow'

export default {
  name: 'OutboundDraftRow',
  extends: OutboundShipmentRow,
  methods: {
    editDraft (item) {
      const {createTime, lastModifiedTime, draftComments, ...rest} = item
      this.$router.push({
        path: `/toEveryone/initDraft`,
        query: rest
      })
    },
    cancelDraft (item) {
      if (!confirm('Are you sure to remove this draft?')) return Promise.resolve()
      return this.$store.dispatch('cancelShipmentDraft', item)
    }
  }
}
</script>
