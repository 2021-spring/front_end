<template>
  <div>
    <v-layout justify-end>

      <v-flex xs4 md2>
        <v-select
          label="Organization name"
          v-model="selectedTenant"
          :items="tenantWorkFor"
          item-text="tenantName"
          item-value="tenantKey"
        />
      </v-flex>
      <v-spacer></v-spacer>
      <v-flex xs4 md2 v-if="!hideSearch">
        <v-text-field
          append-icon="filter_list"
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
      :items.sync="selectedTasks"
      item-key="key"
      class="elevation-2 myDense"
      :search="filter"
      ref="TaskDataTable"
      :pagination.sync="pagination"
      :rows-per-page-items="rowPerPage"
    >
      <template v-slot:items="props">
          <td class="subheading">{{ props.index + 1 }}</td>
          <td class="text-xs-left">{{ props.item.offerKey }}</td>
          <td class="text-xs-left">{{ isOrganization ? props.item.userName : props.item.tenantName }}</td>
          <td class="text-xs-left body-2" style="max-width: 400px">
            <v-flex class='my-2'>
              {{(props.item.productCondition ? props.item.productCondition.toUpperCase() : '') + ' - ' + props.item.productName + (props.item.isPropose ? ' [Proposed]' : '')}}
              <div :class="trackNumsClass">{{props.item.trackingNums}}</div>
            </v-flex>
          </td>
          <td class="text-xs-center">
            <template v-if="props.item.warehouse === 'warehouse' && props.item.isLinkToActiveOffers">
              <v-btn color="primary" flat @click="showSiteAddresses(props.item.warehouseSites)">
                {{ props.item.warehouse }}
              </v-btn>
            </template>
            <template v-else-if="props.item.isLinkToActiveOffers">
              {{ props.item.warehouse }}
            </template>
            <template v-else>
              <strike>{{ props.item.warehouse }}</strike>
            </template>
          </td>
          <td class="text-xs-left">{{ '$' + (parseFloat(props.item.price) + (props.item.warehouse === 'self' && props.item.bonus ? parseFloat(props.item.bonus) : 0)) }}</td>
          <td class="text-xs-center">{{ props.item.quantity + props.item.comfirmedTotal }}</td>
          <td v-if="!isHistory" class="text-xs-center">{{ props.item.quantity }}</td>
          <td class="text-xs-left">{{ getDateString(props.item.createTime) }}</td>
          <td class="justify-center">
            <v-layout justify-center wrap>
              <v-btn v-if="firstFunc" color="primary" flat @click.stop="firstFunc(props.item, props.index)" :id="`confirmTask${props.index + 1}`">{{firstActionText}}</v-btn>
              <v-btn v-if="secondFunc" color="secondary" flat @click.stop="secondFunc(props.item)">{{secondActionText}}</v-btn>
            </v-layout>
          </td>
      </template>
    </v-data-table>
    <TaskAddressPopup v-model="addressToggle" :sites="addressItems" />
  </div>
</template>

<script>
import TaskAddressPopup from './TaskAddressPopup'
import {toTimestampString} from '../utils/tools'

export default {
  name: 'TaskTable',
  components: {
    TaskAddressPopup
  },
  data () {
    return {
      rowPerPage: [30, 50, {text: 'All', value: -1}],
      pagination: {
        sortBy: 'id'
      },
      filter: '',
      addressToggle: false,
      addressItems: [],
      selectedTenant: ''
    }
  },
  mounted () {
    this.$watch(() => this.$refs.TaskDataTable.filteredItems, (newValue, oldValue) => { this.$emit('update:filteredItems', newValue) })
  },
  computed: {
    isOrganization () {
      return this.$store.getters.activeOrganization
    },
    headers () {
      return this.isHistory ? [
        { text: '#', align: 'left', sortable: false, width: '5%', value: 'note' },
        { text: this.isOrganization ? 'Member' : 'Organization', value: this.isOrganization ? 'userName' : 'tenantName', align: 'left', sortable: true },
        { text: 'Item', value: 'productName', align: 'left', sortable: false },
        { text: 'Send-to', value: 'warehouse', align: 'center', sortable: false },
        { text: 'Price', value: 'price', align: 'left', sortable: false },
        { text: 'Quantity', value: 'quantity', align: 'left', sortable: false },
        { text: 'Date', value: 'createTime', align: 'left', sortable: false }
      ] : [
        { text: '#', align: 'left', sortable: false, width: '5%', value: 'note' },
        { text: 'Offer id', value: 'offerKey', align: 'left', sortable: false, width: '1%' },
        { text: this.isOrganization ? 'Member' : 'Organization', value: this.isOrganization ? 'userName' : 'tenantName', align: 'left', sortable: true, width: '1%' },
        { text: 'Item', value: 'productName', align: 'left', sortable: false },
        { text: 'Send-to', value: 'warehouse', align: 'center', sortable: false, width: '1%' },
        { text: 'Price', value: 'price', align: 'left', sortable: false, width: '1%' },
        { text: 'Total qty', value: 'confirmedTotal', align: 'center', sortable: false, width: '1%' },
        { text: 'Unconfirmed qty', value: 'quantity', align: 'center', sortable: true, width: '1%' },
        { text: 'Create time', value: 'createTime', align: 'left', sortable: false, width: '1%' },
        { text: 'Action', value: 'trackingNums', align: 'center', sortable: false }
      ]
    },
    trackNumsClass () {
      return this.$vuetify.breakpoint.smAndDown ? 'trackingNums-small' : (this.$vuetify.breakpoint.mdOnly ? 'trackingNums-medium' : 'trackingNums-large')
    },
    offers () {
      return this.$store.getters.offers
    },
    allOffers () {
      return [...this.offers, ...this.$store.getters.expiredOffers]
    },
    tasks () {
      return this.$store.getters.tasks.map(task => {
        const linkedOffer = (this.allOffers.find(({key}) => task.offerKey === key))
        const warehouseSites = (linkedOffer || {}).warehouseSites || []
        return {
          ...task,
          isLinkToActiveOffers: !!linkedOffer,
          warehouseSites
        }
      })
    },
    tenantWorkFor () {
      return [{tenantName: '-- All --', tenantKey: ''}, ...this.$store.getters.tenantWorkFor]
    },
    selectedTasks () {
      if (this.selectedTenant === '') return this.tasks
      return this.tasks.filter((item) => {
        if (this.selectedTenant !== '' && item.tenantKey !== this.selectedTenant) return false 
        return true
      })
    }
  },
  methods: {
    getDateString (theDate) {
      return toTimestampString(theDate)
    },
    showSiteAddresses (warehouseSites) {
      this.addressItems = warehouseSites
      this.addressToggle = true
    }
  },
  props: {
    Tasks: {
      type: Array,
      default: function () {
        return []
      }
    },
    isHistory: Boolean,
    firstActionText: String,
    secondActionText: String,
    firstFunc: Function,
    secondFunc: Function,
    hideSearch: Boolean,
    filteredItems: Array
  }
}
</script>

<style>
.taskLink-xlarge, .taskLink-xlarge a {
  white-space: pre-wrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: block; 
  max-width: 40vw;
}

.taskLink-large, .taskLink-large a {
  white-space: pre-wrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: block; 
  max-width: 25vw;
}

.taskLink-medium, .taskLink-medium a {
  white-space: pre-wrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: block; 
  max-width: 18vw;
}

.taskLink-small, .taskLink-small a {
  white-space: pre-wrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: block; 
  max-width: 35vw;
}

.taskLink-small, .taskLink-small a {
  white-space: pre-wrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: block; 
  max-width: 35vw;
}

.trackingNums-large {
  color: gray;
  white-space: nowrap;
  width: 25vw;
  overflow: hidden;
  text-overflow: ellipsis;
}

.trackingNums-medium {
  color: gray;
  white-space: nowrap;
  width: 18vw;
  overflow: hidden;
  text-overflow: ellipsis;
}

.trackingNums-small {
  color: gray;
  white-space: nowrap;
  width: 30vw;
  overflow: hidden;
  text-overflow: ellipsis;
}

.trackingNums-small {
  color: gray;
  white-space: nowrap;
  width: 30vw;
  overflow: hidden;
  text-overflow: ellipsis;
}

</style>
