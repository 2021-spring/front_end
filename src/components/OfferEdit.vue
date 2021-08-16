<template>
  <FormSubmitPopup
    :title="title"
    v-model="value"
    :rightMethod="onSubmitted"
    @popupClose="$emit('input', false)"
    :rightButtonText="actionText"
    hasAlert
    large>
    <template v-slot:input>
      <v-layout warp>
        <v-autocomplete
          :items="products"
          item-text="name"
          item-value="id"
          :filter="customFilter"
          v-model="newOffer.productId"
          label="Product"
          prepend-icon="devices_other"
          class="required_field"
          :rules="[fieldIsRequired('product')]"
          clearable
          :disabled="editMode">
          <template v-slot:selection="data">
            <div>{{data.item.id.slice(-5)}} - {{data.item.condition && data.item.condition.toUpperCase()}} - {{data.item.name}}</div>
          </template>
          <template v-slot:item="data">
            <div :id="data.item.id">{{data.item.id.slice(-5)}} - {{data.item.condition && data.item.condition.toUpperCase()}} - {{data.item.name}}</div>
          </template>
        </v-autocomplete>
      </v-layout>
      <v-layout warp align-center>
        <v-flex sm3>
          <v-menu
            ref="expirationPicker"
            lazy
            :close-on-content-click="false"
            v-model="expirationPicker"
            transition="scale-transition"
            offset-y
            full-width
            :nudge-right="40"
            min-width="290px"
            :return-value.sync="newOffer.expirationDate"
          >
            <template v-slot:activator="{ on }">
              <v-text-field
                label="Expiration date"
                v-model="expirationDateFormatted"
                prepend-icon="event"
                v-on="on"
                readonly
              ></v-text-field>
            </template>
            <v-date-picker v-model="newOffer.expirationDate" scrollable>
              <v-spacer></v-spacer>
              <v-btn flat color="primary" @click="expirationPicker = false">Cancel</v-btn>
              <v-btn flat color="primary" @click="$refs.expirationPicker.save(newOffer.expirationDate)">OK</v-btn>
            </v-date-picker>
          </v-menu>
        </v-flex>
        <v-flex sm1></v-flex>
        <v-flex sm3>
          <v-text-field
            label="Payment pending period"
            v-model.number="newOffer.pendingPeriod"
            :rules="[fieldIsRequired('pending period'),
              fieldIsInteger('pending period'),
              fieldIsNoLessThanZero('pending period')]"
            prepend-icon="dehaze"
            :readonly="editMode"
            class="required_field"></v-text-field>
        </v-flex>
        <v-flex sm1></v-flex>
      </v-layout>
      <v-layout>
        <v-flex sm3>
          <v-text-field
            id="newOffer_quantity"
            label="Quantity"
            v-model.number="newOffer.quantity"
            prepend-icon="dehaze"
            :rules="quantityRules"></v-text-field>
        </v-flex>
        <v-flex sm1></v-flex>
        <v-flex sm3>
          <v-text-field
            id="newOffer_price"
            label="Price"
            prepend-icon="attach_money"
            v-model.number="newOffer.price"
            class="required_field"
            :rules="[fieldIsNoLessThanZero('price'), fieldIsRequired('price')]"></v-text-field>
        </v-flex>
      </v-layout>
      <v-layout warp align-center>
        <v-flex sm4><v-checkbox label="Only ship to warehouse" @change="$refs.offerSites.validate()" v-model="newOffer.isOnlyShipToWarehouse"></v-checkbox></v-flex>
        <template v-if="!newOffer.isOnlyShipToWarehouse" sm6>
          <v-flex sm3>
            <v-text-field
              id="newOffer_min_quantity"
              label="Min self-storage quantity"
              prepend-icon="dehaze"
              v-model.number="newOffer.minQuantity"
              :rules="[fieldIsNoLessThanZero('min-quantity'), fieldIsInteger('min-quantity')]"></v-text-field>
          </v-flex>
          <v-flex sm1></v-flex>
          <v-flex sm3>
            <v-text-field
              id="newOffer_bonus"
              label="Bonus"
              prepend-icon="attach_money"
              v-model.number="newOffer.bonus"
              :rules="[fieldIsNoLessThanZero('bonus')]"></v-text-field>
          </v-flex>
        </template>
      </v-layout>
      <v-layout wrap align-center>
        <v-autocomplete
          id="offer_sites"
          ref="offerSites"
          label="Selected warehouse sites"
          :items="sites"
          item-value="index"
          :item-text="siteNameDisplay"
          v-model="newOffer.warehouseSites"
          small-chips
          deletable-chips
          multiple
          return-object
          prepend-inner-icon="filter_list"
          :rules="[checkWarehouseSites]"
        > 
          <template v-slot:prepend-item>
            <v-list-tile ripple @click="selectAllSites">
              <v-list-tile-action>
                <v-icon 
                  :color="newOffer.warehouseSites && newOffer.warehouseSites.length > 0 ? 'indigo darken-4' : ''"
                >{{ 
                  newOffer.warehouseSites && newOffer.warehouseSites.length === sites.length ?
                   'check_box' :
                    (newOffer.warehouseSites && newOffer.warehouseSites.length > 0 ? 
                      'indeterminate_check_box':
                      'check_box_outline_blank' )
                }}</v-icon>
              </v-list-tile-action>
              <v-list-tile-content>
                <v-list-tile-title>Select All</v-list-tile-title>
              </v-list-tile-content>
            </v-list-tile>
            <v-divider class="mt-2"></v-divider>
          </template>
        </v-autocomplete>
      </v-layout>
      <v-layout wrap align-center>
        <v-flex sm3><v-checkbox label="Visible to all members" v-model="newOffer.isPublic"></v-checkbox></v-flex>
        <v-flex sm1></v-flex>
        <v-flex sm3><v-checkbox label="Notify members" v-model="newOffer.isNotifyMembers"></v-checkbox></v-flex>
        <v-flex sm1></v-flex>
        <v-flex sm3>
          <v-checkbox label="Required service tag" v-model="newOffer.isRequiredServiceTag"></v-checkbox>
        </v-flex>
      </v-layout>
      <v-autocomplete
        ref="offerEditAutocomplete"
        @change="$refs.offerEditAutocomplete['lazySearch'] = ''"
        v-model="newOffer.sendTo"
        :items="members"
        item-text="name"
        item-value="key"
        chips
        deletable-chips
        multiple
        solo
        return-object
        prepend-inner-icon="filter_list"
        :loading="$store.getters.loadingMembers"
        v-if="!newOffer.isPublic"
      >
        <template v-slot:item="data">
          <template v-if="typeof data.item !== 'object'">
            <v-list-tile-content v-text="data.item"></v-list-tile-content>
          </template>
          <template v-else>
            <v-list-tile-content>
              <v-list-tile-title>
                <v-icon v-if="data.item.isGroup">group</v-icon>
                <v-icon v-else>person</v-icon>
                {{data.item.name}}
              </v-list-tile-title>
            </v-list-tile-content>
          </template>
        </template>
      </v-autocomplete>
      <v-textarea
        id="newOffer_note"
        label="Note"
        outline
        v-model="newOffer.note"
        class="thinBox"></v-textarea>
    </template>
    <template v-slot:control1 v-if="editMode">
      <input type="checkbox" id="checkbox" style="width: 20px; height: 20px; vertical-align: middle;" v-model="moveToTop">
      <label for="checkbox" style="font-size: 16px">Move to top</label>
    </template>
  </FormSubmitPopup>
</template>

<script>
import FormSubmitPopup from './FormSubmitPopup'
import {toDateEnd, toPickerDateString, timeTools, checkRules, toMoney} from '../utils/tools'
import addDays from 'date-fns/addDays'

export default {
  name: 'offerEdit',
  components: {
    FormSubmitPopup
  },
  mixins: [timeTools, checkRules],
  data () {
    return {
      expirationPicker: false,
      expirationDateFormatted: '',
      taskExpirationPicker: false,
      newOffer: {
        pendingPeriod: 0
      },
      taskExpirationDateFormatted: '',
      quantityRules: [
        this.fieldIsInteger('quantity'), 
        this.fieldIsRequired('quantity'),
        this.fieldIsNoLessThanZero('quantity'),
        v => (v >= (this.newOffer.taken || 0)) || `Must be greater than the total number of items currently taken (${this.newOffer.taken})`  
      ],
      moveToTop: true
    }
  },
  mounted () {
    let newOffer = {...this.offer}
    if (newOffer.key) {
      // old offer
      newOffer.sendTo = newOffer.selected && newOffer.selected.groups ? newOffer.selected.groups : []
      newOffer.selected && newOffer.selected.users && (newOffer.sendTo = newOffer.sendTo.concat(newOffer.selected.users))
      newOffer.expirationDate = newOffer && toPickerDateString(newOffer.expirationDate)
    } else {
      // new offer initialize
      newOffer.isNotifyMembers = true
      let defaultExpiration = addDays(new Date(), 3)
      newOffer.expirationDate = toPickerDateString(defaultExpiration)
      newOffer.pendingPeriod = parseInt(this.pendingPeriodDefault)
      newOffer.minQuantity = 1
      newOffer.bonus = 0
      newOffer.sendTo = (this.$store.getters.tenantLimitedInfo.defaultUsers || [])
        .filter(item => item.isGroup || (!item.isGroup && this.members.some(member => member.key === item.key)))
      newOffer.isPublic = this.$store.getters.tenantLimitedInfo.isOfferPublic === undefined ? true : this.$store.getters.tenantLimitedInfo.isOfferPublic
    }
    if (this.initProduct) {
      let {id, price} = this.initProduct
      newOffer.productId = id
      newOffer.price = price || 0
    }
    newOffer.warehouseSites = this.getOfferWarehouseSites(newOffer)
    this.newOffer = newOffer
  },
  watch: {
    'newOffer.expirationDate': function (value) {
      this.expirationDateFormatted = this.formatDate(value)
    },
    immediate: true
  },
  computed: {
    products () {
      return this.$store.getters.products
    },
    members () {
      let groups = this.$store.getters.groups.map(item => { let {name, groupKey: key} = item; return {name, key, isGroup: true} })
      let members = [{ header: 'Groups' }, ...groups, { divider: true }, { header: 'Users' }]
      let activeUsers = this.$store.getters.users.filter(user => user.approvalType === 3)
      activeUsers.forEach(item => {
        let {name, uid: key} = item
        members.push({name, key, isGroup: false})
      })
      return members
    },
    pendingPeriodDefault () {
      return this.$store.getters.tenantLimitedInfo.pendingPeriod || 0
    },
    sites () {
      return this.$store.getters.warehouseSites || []
    }
  },
  methods: {
    getProduct (id) {
      return this.products.find(item => item.id === id) || {}
    },
    onSubmitted () {
      let {sendTo, ...offer} = this.newOffer
      offer.selected = {users: [], groups: []}
      if (!offer.isPublic && sendTo) {
        sendTo.forEach(item => {
          if (item.isGroup) {
            offer.selected.groups.push(item)
          } else {
            offer.selected.users.push(item)
          }
        })
      }
      offer.expirationDate = offer.expirationDate && toDateEnd(offer.expirationDate)
      // offer.taskExpirationDate = offer.taskExpirationDate && toDateEnd(offer.taskExpirationDate)
      offer.tenantName = this.$store.getters.tenant.name
      let product = this.getProduct(offer.productId)
      offer.productName = product.name
      offer.productCondition = product.condition
      !offer.taken && (offer.taken = 0)
      !offer.isExpired && (offer.isExpired = false)
      !offer.note && (offer.note = '')
      !(offer.price > 0) && (offer.price = toMoney(offer.price))
      return this.actionFunc(offer, this.moveToTop)
    },
    customFilter (item, queryText, itemText) {
      const textOne = item.name ? item.name.toLowerCase() : ''
      const textTwo = item.id ? item.id.toLowerCase() : ''
      const searchText = queryText.toLowerCase()

      return textOne.indexOf(searchText) > -1 ||
        textTwo.indexOf(searchText) > -1
    },
    siteNameDisplay (site) {
      return (site.warehouseName ? site.warehouseName + ' - ' : '') + site.siteName
    },
    getOfferWarehouseSites (offer) {
      if (Array.isArray(offer.warehouseSites)) {
        return offer.warehouseSites.map(offerSite => 
          (this.sites.find(site => site.address1 === offerSite.address1 && site.siteName === offerSite.siteName))
        ).filter(site => site)
      }
      if (Array.isArray(offer.warehouseKeys)) {
        return this.sites.filter(site => offer.warehouseKeys.includes(site.warehouseKey))
      }
      return this.sites
    },
    selectAllSites () {
      this.$nextTick(() => {
        if (this.newOffer.warehouseSites.length === this.sites.length) {
          this.newOffer.warehouseSites = []
        } else {
          this.newOffer.warehouseSites = [...this.sites]
        }
      })
    },
    checkWarehouseSites (v) {
      if (this.newOffer && !this.newOffer.isOnlyShipToWarehouse) return true
      return v.length ? true : 'Need at least a site to create offer'
    }
  },
  props: {
    title: String,
    value: Boolean,
    editMode: {
      type: Boolean,
      default: false
    },
    actionText: {
      type: String,
      default: 'Save'
    },
    actionFunc: Function,
    offer: {
      type: Object,
      default: () => {
        return {}
      }
    },
    initProduct: Object
  }
}
</script>

<style>
.x-small.btn  {
  height: 25px;
  width: 25px;
  margin: 5px 4px;
}
</style>
