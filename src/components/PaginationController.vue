<template>
  <v-flex class="mb-5" v-scroll="onScroll">
    <v-layout justify-space-between align-baseline>
      <v-flex d-flex align-center v-if="haveSearchBox">
        <slot name="beforeSearchBox"></slot>
        <v-flex md10 :offset-md1="$slots.beforeSearchBox">
          <v-text-field
            :label="searchBoxLabel"
            v-model="searchValue"
            :hint="searchBoxHint"
            :disabled="loading"
            clearable
            @keyup.enter="$$initiateTable"></v-text-field>
        </v-flex>
      </v-flex>
      <v-flex>
        <slot name="beforeMenu"></slot>
      </v-flex>
      <v-flex md6 d-flex justify-end align-center>
        <v-flex md5 v-if="isPaymentTenant">
          <v-switch
            :label="searchDateSwitch ? 'Search by estimate date' : 'Search by create date'"
            v-model="searchDateSwitch"
            :disabled="loading"
          ></v-switch>
        </v-flex>
        <v-flex md3 v-if="haveStartDate">
          <v-menu
            :close-on-content-click="false"
            v-model="startMenu"
            :nudge-right="40"
            lazy
            transition="scale-transition"
            offset-y
            full-width
            min-width="290px"
            :disabled="loading"
          >
            <template v-slot:activator="data">
              <v-text-field
                v-model="startDateFormatted"
                :label="startDateLabel"
                prepend-icon="event"
                readonly
                v-on="data.on"
              ></v-text-field>
            </template>
            <v-date-picker v-model="startDateString" @input="startMenu = false"></v-date-picker>
          </v-menu>
        </v-flex>
        <v-flex md3 v-if="!haveNoEndDate">
          <v-menu
            :close-on-content-click="false"
            v-model="endMenu"
            :nudge-right="40"
            lazy
            transition="scale-transition"
            offset-y
            full-width
            min-width="290px"
            :disabled="loading"
          >
            <template v-slot:activator="data">
              <v-text-field
                v-model="endDateFormatted"
                :label="endDateDisplayLabel"
                prepend-icon="event"
                readonly
                v-on="data.on"
              ></v-text-field>
            </template>
            <v-date-picker v-model="endDateString" @input="endMenu = false"></v-date-picker>
          </v-menu>
        </v-flex>
        <v-flex md3>
          <v-btn small color="primary" @click="onDateSubmit" :disabled="loading">Search</v-btn>
        </v-flex>
        <slot name="afterDate"></slot>
      </v-flex>
      <v-flex xs8 md2 v-if="canSearch">
        <v-text-field
          append-icon="filter_list"
          label="search"
          single-line
          hide-details
          v-model="filter"
          :disabled="loading"
          clearable
        ></v-text-field>
      </v-flex>
    </v-layout>
    <div class="slotTable"><slot name="dataTable" :isLoadedToEnd="isLoadedToEnd"></slot></div>
    <v-layout justify-center>
      <v-progress-circular v-if="loading" color="blue" indeterminate></v-progress-circular>
    </v-layout>
  </v-flex>
</template>

<script>
import { toDateEnd, toDateStart, convertTimestampToDateInObj, toPickerDateString } from '../utils/tools'
// TODO this component needs further integration.
export default {
  name: 'PaginationController',
  data () {
    return {
      loading: false,
      startDateString: this.haveStartDate ? '2019-10-01' : '2018-10-01',
      startDateFormatted: this.haveStartDate ? this.formatDate('2019-10-01') : this.formatDate('2018-10-01'),
      startMenu: false,
      endDateString: toPickerDateString(new Date()),
      endDateFormatted: this.formatDate(toPickerDateString(new Date())),
      endMenu: false,
      endDocLocal: {},
      endDocArrayLocal: [],
      filter: '',
      payload: {},
      endDocArrayLocalAllResolved: true,
      searchValue: '',
      searchDateSwitch: false
    }
  },
  created () {
    this.payload = {}
    this.$$initiateTable()
    this.getPaginationDataOutside && (this.endDocArrayLocalAllResolved = false)
  },
  computed: {
    isLoadedToEnd () {
      return !(this.loading === false && (!this.endDocArrayLocalAllResolved || (this.endDocLocal && this.endDocLocal.exists)))
    },
    endDateDisplayLabel () {
      return this.endDateLabel || (this.searchDateSwitch ? 'Estimate date' : 'End date')
    }
  },
  watch: {
    filter (value) {
      this.toParentFilter(value)
    },
    startDateString (value) {
      this.startDateFormatted = this.formatDate(this.startDateString)
    },
    endDateString (value) {
      this.endDateFormatted = this.formatDate(this.endDateString)
    },
    checkBox (value) {
      this.$$initiateTable()
    },
    select (value) {
      if (this.isRefreshSelect) {
        this.$$initiateTable()
      }
    },
    outsideScrollToBottom (value) {
      if (value && (this.loading === false) && (!this.endDocArrayLocalAllResolved || (this.endDocLocal && this.endDocLocal.exists))) {
        this.startGetData()
      }
    },
    refresh () {
      this.$$initiateTable()
    },
    loading (value) {
      this.$emit('setLoading', value)
    }
  },
  methods: {
    $$initiateTable () {
      if (this.loading) return
      this.$emit('input', [])
      this.payload.startAfter && (delete this.payload.startAfter)
      this.loading = true
      if (this.getPaginationDataOutside) {
        this.getDataFromMultiCollections()
      } else {
        this.getPaginationData(this.payload)
      }
    },
    getDataFromMultiCollections () {
      this.addPredicatesToPayload(this.payload)

      this.getPaginationDataOutside(this.payload)
        .then(endDocArray => {
          if (!endDocArray) return
          this.endDocArrayLocal = endDocArray
          this.endDocArrayLocalAllResolved = this.endDocArrayLocal.reduce((result, item) => {
            return result && (item === 'resolved')
          }, true)
          this.loading = false
        })
        .catch((error) => {
          this.loading = false
          console.log(error.message)
        })
    },
    onScroll (e) {
      let height = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight
      let scrollTop = document.documentElement.scrollTop === 0 ? document.body.scrollTop : document.documentElement.scrollTop
      let scrollHeight = document.documentElement.scrollTop === 0 ? document.body.scrollHeight : document.documentElement.scrollHeight
      if ((Math.abs(height + scrollTop - scrollHeight) <= 2) && !this.isLoadedToEnd) {
        this.startGetData()
      } 
    },
    startGetData () {
      this.loading = true
      this.payload.startAfter = this.endDocArrayLocal.length === 0 ? this.endDocLocal : this.endDocArrayLocal
      if (this.getPaginationDataOutside) {
        this.getDataFromMultiCollections()
      } else {
        this.getPaginationData(this.payload)
      }   
    },
    addPredicatesToPayload (payload) {
      payload.predicates = {}
      
      this.checkBox && (payload.predicates.predicateCheckBox = true)
      this.select && (payload.predicates.predicateSelect = this.select)
      this.searchValue && (payload.predicates.predicateText = this.getSearchValue())
      this.searchDateSwitch && (payload.predicates.predicateSwitch = this.searchDateSwitch)
      this.actionPredicates && this.actionPredicates.length !== 0 && (payload.predicates.actionPredicates = this.actionPredicates)
    },
    getPaginationData (payload) {
      payload && (payload.limit || (payload.limit = this.historyLimit))

      this.addPredicatesToPayload(payload)

      if (this.actionPayload) {
        payload.actionPayload = this.actionPayload
      }
      if (this.isUsingModelInAction) {
        return this.$store.dispatch(this.getDataActionName, payload)
          .then(({models, docs}) => {
            if (models) {
              let newData = [...this.value, ...models]
              let endDoc = docs.docs[docs.docs.length - 1]
              if (Array.isArray(endDoc)) {
                this.endDocArrayLocal = endDoc
              } else {
                this.endDocLocal = endDoc
              }
              this.loading = false
              this.$emit('input', newData)
            }
          })
          .catch((error) => {
            this.loading = false
            console.log(error.message)
          })
      }
      return this.$store.dispatch(this.getDataActionName, payload)
        .then(docs => {
          if (docs) {
            let data = []
            let endDoc = docs.docs[docs.docs.length - 1]
            docs.forEach(doc => {
              const obj = convertTimestampToDateInObj(doc.data())
              obj.paginationKey = doc.id
              obj._key = doc.id
              data.push(obj)
            })
            let newData = [...this.value, ...data]
            if (Array.isArray(endDoc)) {
              this.endDocArrayLocal = endDoc
            } else {
              this.endDocLocal = endDoc
            }
            this.loading = false
            this.$emit('input', newData)
          }
        })
        .catch((error) => {
          this.loading = false
          console.log(error.message)
        })
    },
    toDateFormString (timestamp) {
      return timestamp && toDateEnd(timestamp)
    },
    toDateFormStart (timestamp) {
      return timestamp && toDateStart(timestamp)
    },
    formatDate (date) {
      if (!date) return null

      const [year, month, day] = date.split('-')
      return `${month}/${day}/${year}`
    },
    onDateSubmit () {
      if (this.searchDateSwitch) {
        this.payload = {
          ...this.payload,
          startDate: this.toDateFormStart(new Date(this.endDateString.replace(/-/g, '/'))),
          endDate: this.toDateFormString(new Date(this.endDateString.replace(/-/g, '/'))),
          limit: this.historyLimit
        }
      } else {
        this.payload = {
          ...this.payload,
          startDate: new Date(Date.parse(this.startDateString.replace(/-/g, '/'))),
          endDate: this.toDateFormString(new Date(this.endDateString.replace(/-/g, '/'))),
          limit: this.historyLimit
        }
      }
      this.$$initiateTable(this.payload)
    },
    getSearchValue () {
      if (this.keepKeywordCase) {
        return this.searchValue.trim()
      }
      if (this.keywordToUpperCase) {
        return this.searchValue.trim().toUpperCase()
      }
      return this.searchValue.trim().toLowerCase()
    }
  },
  props: {
    value: Array,
    getPaginationDataOutside: Function,
    getDataActionName: String,
    actionPredicates: Array,
    historyLimit: Number,
    toParentFilter: Function,
    canSearch: Boolean,
    haveStartDate: Boolean,
    startDateLabel: {
      type: String,
      default: 'Start date'
    },
    endDateLabel: String,
    haveNoEndDate: Boolean,
    actionPayload: Object,
    outsideScrollToBottom: Boolean,
    checkBox: Boolean,
    select: String,
    isRefreshSelect: {
      type: Boolean,
      default: () => {
        return true
      }
    },
    haveSearchBox: Boolean,
    searchBoxLabel: String,
    searchBoxHint: String,
    isPaymentTenant: Boolean,
    refresh: Boolean,
    isUsingModelInAction: Boolean,
    keywordToUpperCase: Boolean,
    keepKeywordCase: Boolean
  }
}
</script>
