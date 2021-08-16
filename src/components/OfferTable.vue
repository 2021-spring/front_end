<template>
  <div>
    <v-layout align-baseline justify-space-between>
      <template v-if="!isOrganization">
        <v-flex md3 lg2>
          <v-select
            label="Organization name"
            v-model="selectedTenant"
            :items="tenantWorkFor"
            item-text="tenantName"
            item-value="tenantKey"></v-select>
        </v-flex>
        <v-flex md1 lg1></v-flex>
        <v-flex md2 xl1 v-if="participationFilter">
          <v-select
            label="Participation"
            v-model="selectedParticipation"
            :items="participationFilterItems"
          ></v-select>
        </v-flex>
      </template>
      <v-flex v-if="isShowAddOffer && isOrganization" xs3>
        <v-layout>
          <v-flex>
            <v-btn dark color="primary" @click.stop="addOfferFunc" id="addOffer"><v-icon dark>add</v-icon>Add offer</v-btn>
          </v-flex>
          <v-flex>
            <v-btn color="primary" @click.stop="batchArchive" id="addOffer" :disabled="!selectedOffers.length">Archive offers ({{selectedOffers.length}})</v-btn>
          </v-flex>
        </v-layout>
      </v-flex>
      <v-spacer></v-spacer>
      <v-flex xs4 md2 v-if="!hideSearch">
        <v-text-field
          append-icon="filter_list"
          class="text-xs-right"
          label="Search"
          single-line
          hide-details
          v-model="filter"
        ></v-text-field>
      </v-flex>
    </v-layout>
    <v-layout v-if="$attrs.isRealtime" justify-start align-baseline>
      <v-flex class="success--text caption"><span class="realtime-border px-1">REAL TIME</span></v-flex>
    </v-layout>
    <v-data-table
      :headers="headers"
      :items.sync="filteredOffers"
      class="elevation-2 myDense"
      :search="filter"
      ref="offerTable"
      select-all="blue"
      item-key="key"
      v-model="selectedOffers"
      :pagination.sync="pagination"
      :rows-per-page-items="rowPerPage">
      <template v-slot:items="props">
        <td class="checkbox-align-center">
          <v-layout>
            <v-checkbox
              @click.stop="() => { props.selected = !props.selected }"
              :value="props.selected"
              primary
              hide-details
            ></v-checkbox>
          </v-layout>
        </td>
        <td class="subheading">
          {{ isNaN(props.item.key) ?  (isNaN(props.item.offerKey) ? props.index + 1 : props.item.offerKey) : props.item.key}}
          <v-tooltip top>
            <template v-slot:activator="{ on }">
              <v-icon small v-if="props.item.isParticipated" v-on="on">pan_tool</v-icon>
            </template>
            <span>Participated</span>
          </v-tooltip>
        </td>
        <td v-if="!isOrganization" class="text-xs-left">{{props.item.tenantName || "new org"}}</td>
        <td v-if="isPropose && isOrganization" class="text-xs-left">{{props.item.userName}}</td>
        <td class="text-xs-left">
          <v-flex :class="noteClass">
            <OfferWidget
              :name="getProduct(props.item.productId).name || props.item.productName"
              :condition="getProduct(props.item.productId).condition || props.item.productCondition"
              :isPublic="props.item.isPublic"
              :price="props.item.price"
              :note="props.item.note"
              :isPropose="props.item.isPropose"
              :shipTo="props.item.warehouse"
              :isExpired="!isPropose && props.item.isExpired"
              :expirationDate="props.item.expirationDate"
              :pendingPeriod="props.item.pendingPeriod"
              :createTime="props.item.createTime"></OfferWidget>
          </v-flex>
        </td>
        <td class="text-xs-left">{{ '$' + props.item.price }} <span v-if="props.item.bonus && !isPropose">(+{{props.item.bonus}})</span></td>
        <td v-if="isPropose && isOrganization" class="text-xs-left">{{ '$' + (props.item.originPrice) }} <span v-if="props.item.originBonus">(+{{props.item.originBonus}})</span></td>
        <td v-if="!isPropose && isOrganization" class="text-xs-left">
          <v-tooltip top>
            <template v-slot:activator="{on}">
              <div v-on="on">
                {{props.item.quantity}}
                {{props.item.proposeQuantity ? ' + ' + props.item.proposeQuantity : ''}}
              </div>
            </template>
            Origin: {{props.item.quantity}}
            <template v-if="props.item.proposeQuantity">
            , propose: {{props.item.proposeQuantity}}
            </template>
          </v-tooltip>
        </td>
        <td class="text-xs-left">{{ !isPropose && props.item.taken ? props.item.quantity - props.item.taken :  props.item.quantity }}</td>
        <td v-if="isPropose" class="text-xs-left">{{ toDateString(props.item.createTime) }}</td>
        <td class="text-xs-right">
          <v-layout row>
            <v-flex v-if="firstFunc">
              <LoaderButton
                flat
                :buttonText="firstActionText"
                :promiseAwait="firstFunc"
                :promiseItem="props.item"
                v-model="isLoading"/>  
            </v-flex>
            <v-flex v-if="midFunc">
              <v-badge :value="checkNewComment(props.item)" color="red" overlap>
                <template v-slot:badge>
                  <span class="badge">new</span>
                </template>
                <v-btn dark color="primary" flat @click.stop="midFunc(props.item)">Comments</v-btn>
              </v-badge></v-flex>
            <v-flex v-if="secondFunc"><v-btn dark color="primary" flat @click.stop="secondFunc(props.item)" :id="`offerTableSecondAction${props.index + 1}`">{{typeof secondActionText === 'function' ? secondActionText(props.item) : secondActionText}}</v-btn></v-flex>
          </v-layout>
        </td>
      </template>
    </v-data-table>
  </div>
</template>

<script>
import OfferWidget from './OfferWidget'
import LoaderButton from './LoaderButton'
import {timeTools} from '@/utils/tools'

export default {
  name: 'offerTable',
  components: {
    OfferWidget,
    LoaderButton
  },
  mixins: [timeTools],
  data () {
    return {
      rowPerPage: [30, 50, {text: 'All', value: -1}],
      pagination: {
        sortBy: 'lastEditTime',
        descending: true
      },
      filter: '',
      selectedTenant: '',
      selectedParticipation: null,
      isLoading: false,
      participationFilterItems: [
        {text: '-- All --', value: null}, 
        {text: 'Participated', value: true}, 
        {text: 'Not participated', value: false}
      ],
      selectedOffers: []
    }
  },
  computed: {
    headers () {
      if (this.isPropose) {
        if (!this.isOrganization) {
          return [
            { text: 'ID#', align: 'left', sortable: false, value: 'key', width: '5%' },
            { text: 'Organization', value: 'tenantName', align: 'left', sortable: false, width: '10%' },
            { text: 'Offer', value: 'productName', align: 'left', sortable: false },
            { text: 'Price', value: 'price', align: 'left', sortable: false },
            { text: 'Quantity', value: 'quantity', align: 'left', sortable: false },
            { text: 'Create time', value: 'createTime', sortable: true },
            { text: 'Action', value: 'note', align: 'center', sortable: false, width: '8%' }
          ]
        } else {
          return [
            { text: 'ID#', align: 'left', sortable: false, value: 'key', width: '5%' },
            { text: 'Member', value: 'userName', align: 'left', sortable: false },
            { text: 'Offer', value: 'productName', align: 'left', sortable: false },
            { text: 'Price', value: 'price', align: 'left', sortable: false },
            { text: 'Origin price', value: 'price', align: 'left', sortable: false },
            { text: 'Quantity', value: 'quantity', align: 'left', sortable: false },
            { text: 'Create time', value: 'createTime', sortable: true },
            { text: 'Action', value: 'note', align: 'center', sortable: false, width: '8%' }
          ]
        }
      } else {
        if (!this.isOrganization) {
          return [
            { text: 'ID#', align: 'left', sortable: false, value: 'key', width: '7%' },
            { text: 'Organization', value: 'tenantName', align: 'left', sortable: false, width: '10%' },
            { text: 'Offer', value: 'productName', align: 'left', sortable: false },
            { text: 'Price', value: 'price', align: 'left', sortable: false },
            { text: 'Quantity', value: 'quantity', align: 'left', sortable: false },
            { text: 'Action', value: 'note', align: 'center', sortable: false, width: '8%' }
          ]
        } else {
          return [
            { text: 'ID#', align: 'left', sortable: false, value: 'key', width: '5%' },
            { text: 'Offer', value: 'productName', align: 'left', sortable: false },
            { text: 'Price', value: 'price', align: 'left', sortable: false },
            { text: 'Total qty', value: 'quantity', align: 'left', sortable: false },
            { text: 'Available qty', value: 'quantity', align: 'left', sortable: false },
            { text: 'Action', value: 'note', align: 'center', sortable: false, width: '8%' }
          ]
        }
      }
    },
    isOrganization () {
      return this.$store.getters.activeOrganization
    },
    products () {
      return this.$store.getters.products
    },
    filteredOffers () {
      if (this.selectedTenant === '' && this.selectedParticipation === null) return this.offers
      return this.offers.filter((item) => {
        if (this.selectedTenant !== '' && item.tenantKey !== this.selectedTenant) return false 
        if (this.selectedParticipation !== null && item.isParticipated !== this.selectedParticipation) return false
        return true
      })
    },
    tenantWorkFor () {
      return [{tenantName: '-- All --', tenantKey: ''}, ...this.$store.getters.tenantWorkFor]
    },
    noteClass () {
      return this.$vuetify.breakpoint.smAndDown ? 'offerLink-small' : (this.$vuetify.breakpoint.mdOnly ? 'offerLink-medium' : (this.$vuetify.breakpoint.lgOnly ? 'offerLink-large' : 'offerLink-xlarge'))
    }
  },
  methods: {
    getProduct (id) {
      return this.products.find(item => item.id === id) || {}
    },
    checkNewComment (offer) {
      let lastReadTime = offer[`lastRead_${this.$store.getters.uid}`]
      return offer.comments && offer.comments.length && (!lastReadTime || lastReadTime < offer.comments.slice(-1)[0].createTime)
    },
    batchArchive () {
      if (!confirm('Are you sure to archive these offers?')) return
      return this.selectedOffers.map(item => {
        return this.firstFunc({...item, ignoreCheckTasks: true})
      })
    }
  },
  props: {
    offers: {
      type: Array,
      default: function () {
        return [{}]
      }
    },
    firstActionText: String,
    midActionText: String,
    secondActionText: [String, Function],
    firstFunc: Function,
    midFunc: Function,
    secondFunc: Function,
    isShowAddOffer: Boolean,
    addOfferFunc: Function,
    hideSearch: Boolean,
    isPropose: {
      type: Boolean,
      default: false
    },
    participationFilter: {
      type: Boolean,
      default: false
    }
  }
}
</script>

<style>
.offerLink-xlarge, .offerLink-xlarge .offer-widget {
  overflow-wrap: break-word !important;
  max-width: 55vw !important;
}

.offerLink-large, .offerLink-large .offer-widget {
  overflow-wrap: break-word !important;
  max-width: 50vw !important;
}

.offerLink-medium, .offerLink-medium .offer-widget {
  overflow-wrap: break-word !important;
  max-width: 40vw !important;
}

.offerLink-small, .offerLink-small .offer-widget {
  overflow-wrap: break-word !important;
  max-width: 35vw;
}

.badge {
  font-size: 10px;
}

@keyframes blink {
0%{opacity: 0;}
50%{opacity: 100;}
100%{opacity: 0;}
}
@-webkit-keyframes blink {
0% {opacity: 0;}
50% {opacity: 100;}
100% {opacity: 0;}
}
</style>
