<template>
  <v-container fluid>
    <v-tabs color="transparent" v-model="tab" show-arrows>
      <v-tabs-slider color="primary"></v-tabs-slider>
      <v-tab v-for="tabItem in tabs" :key="tabItem.value">
        {{ tabItem.displayName }}
      </v-tab>
    </v-tabs>
    <v-tabs-items v-model="tab" touchless>
      <v-tab-item v-for="tabItem in tabs" :key="tabItem.value">
        <template 
          v-if="tabItem.value === 'tracking' && tabValue === 'tracking'">
          <v-layout align-baseline>
            <v-flex xs12 md3>
              <v-layout align-baseline>
                <v-text-field
                  name="input-1"
                  label="Tracking"
                  id="search"
                  title="Enter to search"
                  :value="barcode"
                  @input="v => barcode = normalizeInputString(v)"
                  @keyup.enter="searchNow"
                  autofocus
                ></v-text-field>
                <v-btn 
                  small
                  color="primary" 
                  @click="searchNow"
                >Search</v-btn>
              </v-layout>
            </v-flex>
          </v-layout>
          <v-layout row wrap>
            <v-flex xs12>
              <v-data-table
                :headers="getHeaders()"
                :items="tempPackges"
                :pagination.sync="pagination"
                :rows-per-page-items="rowPerPage"
                class="elevation-1"
                :loading="loading"
              >
                <v-progress-linear v-slot:progress color="blue" indeterminate></v-progress-linear>
                <template v-slot:items="props">
                  <td class="text-xs-left">{{getTrackingText(props.item.trackings)}}</td>
                  <td class="text-xs-left">{{ props.item.upc }}</td>
                  <td class="text-xs-left">{{ props.item.quantity }}</td>
                  <td class="text-xs-left">{{ getTenant(props.item.organizationKey).tenantName || 'Unknown org' }}</td>
                  <td class="text-xs-left">{{ props.item.siteName || '' }}</td>
                  <td class="text-xs-left">
                    <template v-if="props.item.isConfirmed">
                      <v-tooltip top>
                        <template v-slot:activator="data">
                          <v-icon class="ml-3" v-on="data.on">check_circle</v-icon>
                        </template>
                        <span>{{ props.item.confirmedTime ?
                          toTimestampString(props.item.confirmedTime) : 
                          'Confirm time missing'
                        }}</span>
                      </v-tooltip>
                    </template>
                  </td>
                  <td class="text-xs-left">{{ props.item.createTime ? toTimestampString(props.item.createTime) : ''}}</td>
                  <td class="text-xs-left">
                    <v-tooltip top>
                      <template v-slot:activator="{ on }">
                        <span>
                          <v-icon left 
                            :color="checkFavorite(props.item)?'yellow darken-2':'grey light-2'"
                            v-on="on"
                            @click="setFavorite(props.item, !checkFavorite(props.item))"
                          >star</v-icon>
                        </span>
                      </template>
                      <span>{{ checkFavorite(props.item) ? 'Remove from favorites' : 'Add to favorites' }}</span>
                    </v-tooltip>
                    <v-tooltip top>
                      <template v-slot:activator="{ on }">
                        <span>
                          <v-icon left 
                            :color="props.item.isAbnormal?'error':'warning'"
                            v-if="checkPackageNote(props.item)" 
                            v-on="on"
                            @click="showNoteAndComments(props.item)"
                          >{{ props.item.isAbnormal ? 'flag' : 'comment'}}</v-icon>
                        </span>
                      </template>
                      <span>{{ showFlagText(props) }}</span>
                    </v-tooltip>
                  </td>
                </template>
              </v-data-table>
            </v-flex>
          </v-layout>
        </template>
        <template 
          v-if="tabItem.value === 'favorite' && tabValue === 'favorite'">
          <PaginationController
            v-model="favoritePackages"
            isUsingModelInAction
            getDataActionName="getFavoritePackages"
            :historyLimit="historyLimit">
            <template v-slot:dataTable>
              <v-data-table
                :headers="getHeaders()"
                :items="favoritePackages"
                hide-actions>
                <template v-slot:items="props">
                  <td class="text-xs-left">{{getTrackingText(props.item.trackings)}}</td>
                  <td class="text-xs-left">{{ props.item.upc }}</td>
                  <td class="text-xs-left">{{ props.item.quantity }}</td>
                  <td class="text-xs-left">{{ getTenant(props.item.organizationKey).tenantName || 'Unknown org' }}</td>
                  <td class="text-xs-left">{{ props.item.siteName || '' }}</td>
                  <td class="text-xs-left">
                    <template v-if="props.item.isConfirmed">
                      <v-tooltip top>
                        <template v-slot:activator="data">
                          <v-icon class="ml-3" v-on="data.on">check_circle</v-icon>
                        </template>
                        <span>{{ props.item.confirmedTime ?
                          toTimestampString(props.item.confirmedTime) : 
                          'Confirm time missing'
                        }}</span>
                      </v-tooltip>
                    </template>
                  </td>
                  <td class="text-xs-left">{{ props.item.createTime ? toTimestampString(props.item.createTime) : ''}}</td>
                  <td class="text-xs-left">
                    <v-tooltip top>
                      <template v-slot:activator="{ on }">
                        <span>
                          <v-icon left 
                            :color="checkFavorite(props.item)?'yellow darken-2':'grey light-2'"
                            v-on="on"
                            @click="setFavorite(props.item, !checkFavorite(props.item))"
                          >star</v-icon>
                        </span>
                      </template>
                      <span>{{ checkFavorite(props.item) ? 'Remove from favorites' : 'Add to favorites' }}</span>
                    </v-tooltip>
                    <v-tooltip top>
                      <template v-slot:activator="{ on }">
                        <span>
                          <v-icon left 
                            :color="props.item.isAbnormal?'error':'warning'"
                            v-if="checkPackageNote(props.item)" 
                            v-on="on"
                            @click="showNoteAndComments(props.item)"
                          >{{ props.item.isAbnormal ? 'flag' : 'comment'}}</v-icon>
                        </span>
                      </template>
                      <span>{{ showFlagText(props) }}</span>
                    </v-tooltip>
                  </td>
                </template>
              </v-data-table>
            </template>
          </PaginationController>
        </template>
      </v-tab-item>
    </v-tabs-items>
    <ChatRoom
      v-model="commentsDialog"
      title="Package info"
      v-if="commentsDialog"
      :comments="comments"
      :lastReadTime="commentsLastRead"
      :docPath="commentsDocPath"
      enableFileUpload
      :readOnly="commentsReadOnly"
      createConnection
    >
      <template v-slot:issue>
        <v-card hover raised>
          <v-card-text>
            <div class="cardTitle"></div>
            <div class="cardText"><b>Note:</b> {{packageInEdit.note}}</div>
            <div v-if="packageInEdit.resolveNote" class="cardText"><b>Resolve note:</b> {{packageInEdit.resolveNote}}</div>
            <v-layout
              v-if="Array.isArray(packageInEdit.attachments) && packageInEdit.attachments.length"
              row wrap>
              <FsFileChip 
                v-for="(file, index) in packageInEdit.attachments"
                :file="file"
                :key="'file' + index"
                width="100%"
                aspect-ratio="1.7"
                class="ma-2"
              />
            </v-layout>
          </v-card-text>
        </v-card>
      </template>1
    </ChatRoom>
  </v-container>
</template>

<script>
import PaginationController from './PaginationController'
import ChatRoom from './ChatRoom'
import FsFileChip from './FsFileChip'
import {mapGetters} from 'vuex'
import {toTimestampString, normalizeInputString} from '@/utils/tools'

export default {
  components: {ChatRoom, PaginationController, FsFileChip},
  data () {
    return {
      barcode: '',
      commentsDialog: false,
      favoritePackages: [],
      historyLimit: 25,
      packageInEdit: {},
      pagination: {},
      rowPerPage: [15, 30, 50, {text: 'All', value: -1}],
      tabs: [
        {displayName: 'By tracking', value: 'tracking'},
        {displayName: 'Favorite', value: 'favorite'}
      ],
      tab: 0,
      tempPackges: []
    }
  },
  mounted () {
    this.getRouterInfo()
  },
  computed: {
    ...mapGetters(['loading', 'uid', 'tenantWorkFor']),
    tabValue () {
      return this.tabs[this.tab].value
    },
    commentsLastRead () {
      return (this.packageInEdit
        && this.packageInEdit[`lastRead_${this.$store.getters.uid}`]) || new Date('2020-1-1')
    },
    commentsDocPath () {
      return ['warehouses', this.packageInEdit.warehouseKey, 'packages', this.packageInEdit._key || this.packageInEdit.key]
    },
    comments () {
      return (this.packageInEdit && this.packageInEdit.comments) || []
    },
    commentsReadOnly () {
      return !this.packageInEdit.isAbnormal
    }
  },
  methods: {
    normalizeInputString,
    getRouterInfo () {
      if (this.tracking) {
        this.barcode = this.tracking
        this.searchNow()
      }
    },
    clearData () {
      this.favoritePackages = []
      this.tempPackges = []
    },
    searchNow () {
      this.$store.dispatch('setLoading', true)
      this.clearData()
      if (!this.barcode || this.barcode === '*') {
        this.$store.dispatch('setLoading', false)
        return
      }
      this.searchTracking()
    },
    searchTracking () {
      return this.searchPackages([
        {field: 'trackings', compare: 'array-contains', value: this.barcode.toUpperCase()}
      ])
    },
    searchPackages (predicates = []) {
      return this.$store.dispatch('searchPackagesInAllWarehouse', {
        predicates
      })
        .then(packages => { this.tempPackges = packages })
        .finally(() => {
          this.$store.dispatch('setLoading', false)
        })
    },
    getHeaders (tabValue = 'tracking') {
      const headers = {
        tracking: [
          { text: 'Tracking number', sortable: false, value: 'tracking' },
          { text: 'UPC', sortable: false, value: 'upc' },
          { text: `Quantity`, sortable: false, value: 'quatity' },
          { text: 'Organization', sortable: false, value: '' },
          { text: 'Warehouse', sortable: false, value: 'warehouseSite' },
          { text: 'Confirmed', sortable: false, value: 'isConfirmed' },
          { text: 'Received', sortable: false, value: 'createTime' },
          { text: 'Action', width: '10%', sortable: false, align: 'left', value: 'action' }
        ]
      }
      return headers[tabValue]
    },
    getTrackingText (trackings) {
      return trackings.join(', ')
    },
    toTimestampString (date) {
      let dateString
      try {
        dateString = toTimestampString(date)
      } catch (error) {
        console.log('convert to date string error: ' + JSON.stringify(date))
        console.log(error)
        dateString = 'error'
      }
      return dateString
    },
    showFlagText (props) {
      return (props.item.note + (props.item.resolveNote ? ` | ${props.item.resolveNote}` : '')) || 
       'Open to see detail'
    },
    showNoteAndComments (packageItem) {
      this.packageInEdit = this.tempPackges.find(pkg => pkg._key === packageItem.key) || packageItem
      this.commentsDialog = true
    },
    checkFavorite ({favorites = []} = {}) {
      return favorites.includes(this.uid)
    },
    async setFavorite (packageItem, isFavorite = true) {
      return this.$store.dispatch('setPackageFavorite', {
        isFavorite, 
        warehouseKey: packageItem.warehouseKey,
        packageKey: packageItem._key,
        uid: this.uid
      })
        .then(isFavor => {
          this.setPackageFavoritesInMem(packageItem, isFavor)
          if (this.tabValue !== 'tracking') {
            const pkg = this.tempPackges.find(({_key}) => _key === packageItem._key)
            pkg && this.setPackageFavoritesInMem(pkg, isFavor)
          }
        })
    },
    getTenant (orgKey = '') {
      const tenant = this.tenantWorkFor.find(({tenantKey}) => orgKey === tenantKey)
      return tenant || {}
    },
    setPackageFavoritesInMem (pkg, isFavor) {
      if (isFavor) {
        pkg.favorites.push(this.uid)
      } else {
        pkg.favorites = pkg.favorites.filter(uid => uid !== this.uid)
      }
    },
    checkPackageNote (pkg = {}) {
      return pkg.isAbnormal || pkg.note || pkg.resolveNote || pkg.comments.length || 
        (Array.isArray(pkg.attachments) && pkg.attachments.length > 0)
    }
  },
  props: ['tracking']
}
</script>

<style>
  .wms-mt-5 {
    margin-top: -50px;
  }

  .wms-mt-3 {
    margin-top: -30px;
  }

  .badge {
    font-size: 10px;
  }
</style>
