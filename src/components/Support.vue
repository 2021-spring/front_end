<template>
  <v-container fluid>
    <v-layout row wrap>
      <v-flex xs6 md3 lg2 class="headline" v-if="isOrg">
        <v-select
          :items="warehouses"
          label="Select vendor"
          item-text="warehouseName"
          return-object
          v-model="currentWarehouse"></v-select>
      </v-flex>
    
      <v-flex xs3 lg1 v-if="isOrg">
        <v-btn color="primary" @click="addNewSupport()">
          <v-icon>add</v-icon> Case
        </v-btn>
      </v-flex>
    </v-layout>
    <v-tabs
      color="transparent"
      v-model="tab"
      show-arrows
    >
      <v-tabs-slider color="primary"></v-tabs-slider>
      <v-tab
        v-for="(tabItem) in tabs"
        :key="tabItem"
      >
        <span class="tabItem">
          {{ tabItem }}
        </span>
      </v-tab>
      <v-tabs-items v-model="tab" touchless>
        <v-tab-item key="active">
          <v-layout row wrap justify-end align-baseline>
            <v-flex class="success--text caption"><span class="realtime-border px-1">REAL TIME</span></v-flex>
            <v-spacer></v-spacer>
            <v-flex xs2 >
              <v-text-field
                name="rtSearch"
                append-icon="filter_list"
                label="Search"
                single-line
                hide-details
                v-model="supportSearch"
                clearable
              ></v-text-field>
            </v-flex>
          </v-layout>
          <v-data-table
            v-if="tabs[tab] === 'Active'"
            :headers="headers"
            :items.sync="activeSupports"
            :search="supportSearch"
            class="elevation-2 myDense"
            :rows-per-page-items="rowPerPage"
          >
            <template v-slot:items="props">
              <td>{{ props.item.caseNumber }}</td>
              <td v-if="activeWarehouse">{{ getOrgId(props.item.tenantKey) + ` (${props.item.tenantName})` }}</td>
              <td v-if="isOrg">{{ props.item.warehouseName }}</td>
              <td v-if="isAdmin">{{ props.item.tenantName || props.item.warehouseName }}</td>
              <td>{{ showStatus(props.item.status) }}</td>
              <td v-if="activeWarehouse || isAdmin">{{ agentDisplay(props.item) }}</td>
              <td>{{ capitalize(props.item.category) }}</td>
              <td>
                <v-layout row wrap :class="questionClass">
                  <v-flex my-2 xs12>
                    <b class="mr-2">Title:</b> {{ props.item.title }}
                  </v-flex>
                  <v-flex my-2 xs12 v-if="props.item.tracking">
                    <b class="mr-2">Tracking#:</b> {{ props.item.tracking }}
                  </v-flex>
                  <v-flex
                    class="text-truncate"
                    v-if="(props.item.comments || []).length" 
                    mb-2 xs12>
                    <b class="mr-2">
                      {{ props.item.comments[props.item.comments.length-1].name }}
                      [{{ toDateMMDDHHmm(props.item.comments[props.item.comments.length-1].createTime) }}]: 
                    </b>
                    {{ lastCommentPreview(props.item) }}
                  </v-flex>
                </v-layout>
              </td>
              <td>{{ toTimestampString(props.item.createTime) }}</td>
              <td text-xs-center>
                <v-layout row>
                  <v-flex>
                    <v-btn dark color="primary" flat @click.stop="showCommentsDialog(props.item)">
                      <v-badge :value="checkNewComment(props.item)" color="red" overlap>
                        <template v-slot:badge>
                          <span class="badge">New</span>
                        </template>
                        <v-flex py-1 px-2>Open</v-flex>
                      </v-badge>
                    </v-btn>
                  </v-flex>
                  <v-flex v-if="activeWarehouse || isAdmin">
                    <v-tooltip top>
                      <template v-slot:activator="{ on }">
                        <v-btn v-on="on" dark color="primary" flat @click.stop="showInternalCommentsDialog(props.item)">
                          <v-badge :value="checkNewInternalComment(props.item)" color="red" overlap>
                            <template v-slot:badge>
                              <span class="badge">New</span>
                            </template>
                            <v-flex py-1 px-2>Internal</v-flex>
                          </v-badge>
                        </v-btn>
                      </template>
                      <div style="white-space: pre-wrap; word-break: break-word; max-width: 300px">{{ 
                        props.item.internalComments && props.item.internalComments.length ? 
                          ( props.item.internalComments[props.item.internalComments.length - 1].name + ': ' +
                            props.item.internalComments[props.item.internalComments.length - 1].content +
                           ( props.item.internalComments[props.item.internalComments.length - 1].file ? ' [attachment]' : '')
                          ) : 
                          '-- No last message --' 
                      }}</div>
                    </v-tooltip>
                  </v-flex>
                </v-layout>
              </td>
            </template>
          </v-data-table>
        </v-tab-item>
        <v-tab-item key="closed">           
          <PaginationController
            v-if="tabs[tab] === 'Closed'"
            v-model="doneSupports"
            :refresh="paginationRefreshTrigger"
            getDataActionName="getDoneSupports"
            :historyLimit="historyLimit"
            :haveSearchBox="!!activeWarehouse || isAdmin"
            searchBoxLabel="Org name / org id / title"
            :select="currentWarehouse.warehouseKey"
            keepKeywordCase
          >
            <template  v-slot:beforeMenu>
              <v-flex xs12 ml-2 text-xs-left>
                Closed cases will be removed after one year
              </v-flex>
            </template>
            <template v-slot:dataTable>
              <v-data-table
                :headers="closedHeaders"
                :items="doneSupports"
                hide-actions
              >
                <template v-slot:items="props">
                  <td>{{ props.item.caseNumber }}</td>
                  <td v-if="activeWarehouse|| isAdmin">{{ getOrgId(props.item.tenantKey) + ` (${props.item.tenantName})` }}</td>
                  <td v-if="isOrg">{{ props.item.warehouseName }}</td>
                  <td v-if="activeWarehouse || isAdmin">{{ agentDisplay(props.item) }}</td>
                  <td>{{ capitalize(props.item.category)}}</td>
                  <td :class="questionClass">
                    <v-layout row wrap>
                      <v-flex my-2 xs12>
                        <b class="mr-2">Title:</b>{{ props.item.title }}
                      </v-flex>
                    </v-layout>
                    <v-layout row wrap>
                      <v-flex my-2 xs12 v-if="props.item.tracking">
                        <b class="mr-2">Tracking#:</b> {{ props.item.tracking }}
                      </v-flex>
                    </v-layout>
                    <v-layout row wrap  v-if="(activeWarehouse || isAdmin) && props.item.keywordDisplay">
                      <v-flex my-2>
                        <b class="mr-2">Keywords:</b>{{ props.item.keywordDisplay }}
                      </v-flex>
                    </v-layout>

                  </td>
                  <td v-if="activeWarehouse || isAdmin">
                    <v-layout row wrap>
                      {{ props.item.resolveTypes && props.item.resolveTypes.join(', ') }}
                    </v-layout>
                    <v-layout row wrap v-if="!!props.item.amount">
                      {{ `$${props.item.amount}` }}
                    </v-layout>
                  </td>
                  <td>{{ toTimestampString(props.item.lastModifiedTime) }}</td>
                  <td text-xs-center>
                    <v-layout row>
                      <v-flex>                  
                        <v-btn dark color="primary" flat @click.stop="showCommentsDialog(props.item)">Open</v-btn>
                      </v-flex>
                      <v-flex v-if="activeWarehouse|| isAdmin">
                        <v-tooltip top>
                          <template v-slot:activator="{ on }">
                            <v-btn v-on="on" dark color="primary" flat @click.stop="showInternalCommentsDialog(props.item)">
                              <v-flex py-1 px-2>Internal</v-flex>
                            </v-btn>
                          </template>
                          <div style="white-space: pre-wrap; word-break: break-word; max-width: 300px">{{ 
                            props.item.internalComments && props.item.internalComments.length ? 
                              ( props.item.internalComments[props.item.internalComments.length - 1].name + ': ' +
                                props.item.internalComments[props.item.internalComments.length - 1].content +
                              ( props.item.internalComments[props.item.internalComments.length - 1].file ? ' [attachment]' : '')
                              ) : 
                              '-- No last message --' 
                          }}</div>
                        </v-tooltip>
                      </v-flex>
                    </v-layout>
                  </td>
                </template>
              </v-data-table>
            </template>
          </PaginationController>
        </v-tab-item>
      </v-tabs-items>
    </v-tabs>
    <SupportEdit 
      v-if="supportEditorToggle"
      v-model="supportEditorToggle"
      :initWarehouse="currentWarehouse"
    />
    <ChatRoom
      v-model="commentsDialog"
      :title="'Case ' + supportInEdit.caseNumber + ` -- [ ${showStatus(supportInEdit.status)} ]`"
      v-if="commentsDialog"
      :lastReadTime="supportLastRead"
      :docPath="['supports', supportKey]"
      :comments="supportComments"
      :readOnly="supportInEdit && supportInEdit.status === 'closed'"
      :nickName="(activeWarehouse || isAdmin) ? supportAgent : ''"
      enableFileUpload
    >
      <template v-slot:issue>
        <v-card hover raised>
          <v-card-text>
            <div class="cardTitle" style="overflow-wrap: break-word;">Create time: {{ toTimestampString(supportInEdit.createTime) }}</div>
            <div v-if="activeWarehouse" class="cardTitle" style="overflow-wrap: break-word;">Organization: {{ getOrgId(supportInEdit.tenantKey) + ` (${supportInEdit.tenantName})` }}</div>
            <div v-else class="cardTitle" style="overflow-wrap: break-word;">Warehouse: {{ supportInEdit.warehouseName }}</div>
            <div class="cardTitle" >{{toTimestampString(supportInEdit.createTime)}}</div>
            <br />
            <div class="cardTitle" style="overflow-wrap: break-word;">Question: {{supportInEdit.title}}</div>
            <div class="cardText" v-if="supportInEdit.tracking">Tracking: {{supportInEdit.tracking}}</div>
            <div class="cardText" v-if="supportInEdit.upc">Upc: {{supportInEdit.upc}}</div>
            <div class="cardText" v-if="supportInEdit.labelId">Label ID: {{supportInEdit.labelId}}</div>
            <div class="cardText" v-if="supportInEdit.quantity !== undefined && supportInEdit.quantity !== ''">Qty: {{supportInEdit.quantity}}</div>
            <div class="cardText" v-if="supportInEdit.shipmentId">Shipment id: {{supportInEdit.shipmentId}}</div>
            <div class="cardText">{{supportInEdit.question}}</div>
            <v-layout v-if="(supportInEdit.attachments || []).length" row wrap>
              <FsFileChip 
                v-for="(file, index) in supportInEdit.attachments"
                :file="file"
                :key="'file' + index"
                width="100%"
                aspect-ratio="1.7"
                class="ma-2"
              />
            </v-layout>
          </v-card-text>
        </v-card>
      </template>
      <template v-if="activeWarehouse || isAdmin" v-slot:operation>
        <v-layout row no-wrap align-baseline>
          <v-flex xs4>
            <v-select
              label="Status"
              class="chatroom-op mx-2"
              :items="supportStatus"
              item-text="displayName"
              item-value="value"
              v-model="supportInEditNewStatus"
            ></v-select>
          </v-flex>

          <v-flex v-if="supportInEditNewStatus === 'in progress' || supportInEditNewStatus === 'closed'" xs4>
            <v-text-field
              name="agentName"
              class="chatroom-op mx-2"
              label="Agent name"
              :value="supportAgent"
              :readonly="supportInEditNewStatus === 'closed'"
              v-model="agentName"
              :clearable="supportInEditNewStatus !== 'closed'"
            ></v-text-field>
          </v-flex>
          <v-flex>
            <v-btn small color="primary" @click.stop="updateSupportStatus()">Change</v-btn>          
          </v-flex>
          <v-flex>
            <v-btn v-if="supportInEdit.status !== 'closed'" small color="primary" @click.stop="showResolvePopup">Resolve</v-btn>          
          </v-flex>
        </v-layout>
      </template>
    </ChatRoom>

    <ChatRoom
      v-model="internalCommentsDialog"
      :title="'Case ' + supportInEdit.caseNumber + ` -- [ ${showStatus(supportInEdit.status)} ] -- internal`"
      v-if="internalCommentsDialog"
      :lastReadTime="internalCommentsLastRead"
      :docPath="['supports', supportKey]"
      commentsField="internalComments"
      :comments="internalComments"
      :readOnly="supportInEdit && supportInEdit.status === 'closed'"
      enableFileUpload
    />
    <SupportResolvePopup
      v-if="resolveDialogFlag"
      v-model="resolveDialogFlag"
      :supportKey="supportKey"
      @resolved="() => {
        updateSupportStatus({
          status: 'closed',
          key: this.supportInEdit._key,
          agentUid: '',
          agentName: ''
        })
      }"
    />
  </v-container>
</template>

<script>
import { timeTools, capitalize } from '@/utils/tools'
import SupportEdit from '@/components/SupportEdit'
import ChatRoom from '@/components/ChatRoom'
import SupportResolvePopup from '@/components/SupportResolvePopup'
import FsFileChip from '@/components/FsFileChip'
import PaginationController from './PaginationController'

export default {
  name: 'Support',
  components: {
    SupportEdit,
    ChatRoom,
    PaginationController,
    FsFileChip,
    SupportResolvePopup
  },
  mixins: [timeTools],
  data () {
    return {
      tab: 0,
      tabs: ['Active', 'Closed'],
      supportEditorToggle: false,
      supportInEdit: {},
      supportInEditNewStatus: '',
      commentsDialog: false,
      internalCommentsDialog: false,
      currentWarehouse: {},
      rowPerPage: [30, 50, {text: 'All', value: -1}],
      paginationRefreshTrigger: false,
      doneSupports: [],
      supportSearch: '',
      agentName: '',
      historyLimit: 25,
      resolveDialogFlag: false
    }
  },
  beforeMount () {
    if (this.warehouses && this.warehouses.length) this.currentWarehouse = this.warehouses[0]
  },
  watch: {
    warehouses (curWarehouses, oldWarehouses) {
      if (!this.currentWarehouse.warehouseKey) {
        if (this.warehouses && this.warehouses.length) this.currentWarehouse = this.warehouses[0]
      } else {
        this.currentWarehouse = this.warehouses.find(warehouse => warehouse.warehouseKey === this.currentWarehouse.warehouseKey) || this.currentWarehouse
      }
    },
    activeSupports (cur, old) {
      if (this.supportInEdit && this.supportInEdit._key) {
        let newInEdit = this.activeSupports.find(({_key}) => _key === this.supportInEdit._key)
        if (newInEdit === undefined) {
          if (this.supportInEdit.status === 'closed') return // this support was closed
          this.supportInEdit.status = 'closed' // support case has been closed by other agent
        } else {
          this.supportInEdit = newInEdit
        }
      }
    },
    tab (cur, old) {
      if (cur === 1) {
        this.paginationRefreshTrigger = !this.paginationRefreshTrigger
      }
    },
    supportInEditNewStatus (cur) {
      if (cur === 'in progress') {
        this.agentName = this.supportAgent
      } else if (cur === 'closed') {
        this.agentName = this.supportInEdit.agentName
      }
    }
  },
  computed: {
    headers () {
      if (this.isOrg) {
        return [
          { text: 'Case number', align: 'left', sortable: (this.tabs[this.tab] === 'Active'), value: 'caseNumber', width: '8%' },
          { text: 'Vendor', align: 'left', sortable: (this.tabs[this.tab] === 'Active'), value: 'warehouseName' },
          { text: 'Status', value: 'status', align: 'left', sortable: false },
          { text: 'Category', value: 'category', align: 'left', sortable: false },
          { text: 'Details', value: 'keywordString', align: 'left', sortable: false, width: '40%' },
          { text: this.tabs[this.tab] === 'Active' ? 'Create Time' : 'Closed Time', value: 'createTime', align: 'left', sortable: false },
          { text: 'Action', value: 'note', align: 'center', sortable: false, width: '6%' }
        ]
      } else {
        if (this.tab === 0) {
          return [
            { text: 'Case number', align: 'left', sortable: (this.tabs[this.tab] === 'Active'), value: 'caseNumber', width: '8%' },
            { text: 'Org', align: 'left', sortable: (this.tabs[this.tab] === 'Active'), value: 'tenantName' },
            { text: 'Status', value: 'status', align: 'left', sortable: false },
            { text: 'Agent name', value: 'agentName', align: 'left', sortable: false },
            { text: 'Category', value: 'category', align: 'left', sortable: false },
            { text: 'Details', value: 'keywordString', align: 'left', sortable: false, width: '40%' },
            { text: this.tabs[this.tab] === 'Active' ? 'Create Time' : 'Closed Time', value: 'createTime', align: 'left', sortable: false },
            { text: 'Action', value: 'note', align: 'center', sortable: false, width: '6%' }
          ]
        } else {
          return [
            { text: 'Case number', align: 'left', sortable: (this.tabs[this.tab] === 'Active'), value: 'caseNumber', width: '8%' },
            { text: 'Org', align: 'left', sortable: (this.tabs[this.tab] === 'Active'), value: 'tenantName' },
            { text: 'Status', value: 'status', align: 'left', sortable: false },
            { text: 'Agent name', value: 'agentName', align: 'left', sortable: false },
            { text: 'Category', value: 'category', align: 'left', sortable: false },
            { text: 'Details', value: 'keywordString', align: 'left', sortable: false, width: '40%' },
            { text: 'Resolution', value: 'resolveType', align: 'left', sortable: false },
            { text: this.tabs[this.tab] === 'Active' ? 'Create Time' : 'Closed Time', value: 'createTime', align: 'left', sortable: false },
            { text: 'Action', value: 'note', align: 'center', sortable: false, width: '6%' }
          ]
        }
      }
    },
    closedHeaders () {
      return this.headers.filter(({text}) => text !== 'Status')
    },
    warehouses () { 
      return [
        ...this.$store.getters.allPreferredWarehouses, 
        {
          warehouseName: 'Vite USA',
          warehouseKey: 'system',
          orgId: 'self'
        }
      ]
    },
    activeSupports () {
      return ([...this.$store.getters.supports, ...this.$store.getters.viteSupports] || [])
        .filter(support => {
          if (this.isOrg) {
            return support.warehouseKey === this.currentWarehouse.warehouseKey
          }
          return true
        })
        .map(item => {
          return {
            ...item,
            keywordString: item.keywords && item.keywords.join()
          }
        })
    },
    activeWarehouse () {
      return this.$store.getters.activeWarehouse
    },
    isOrg () {
      return this.$store.getters.activeOrganization
    },
    supportLastRead () {
      return (this.supportInEdit
        && this.supportInEdit[`lastRead_${this.$store.getters.uid}`]) || new Date('2018-1-1')
    },
    internalCommentsLastRead () {
      return (this.supportInEdit
        && this.supportInEdit[`lastRead_internalComments_${this.$store.getters.uid}`]) || new Date('2018-1-1')
    },
    supportKey () {
      return (this.supportInEdit && this.supportInEdit._key)
    },
    supportComments () {
      return (this.supportInEdit && this.supportInEdit.comments) || []
    },
    internalComments () {
      return (this.supportInEdit && this.supportInEdit.internalComments) || []
    },
    supportAgent () {
      return (this.supportInEdit && this.supportInEdit.agentName) || 
        (this.$store.getters.userExtra && this.$store.getters.userExtra.name) || 
        'IT support'
    },
    user () {
      return this.$store.getters.user
    },
    questionClass () {
      return this.$vuetify.breakpoint.mdAndDown ? 
        'question-medium' : 
        (
          this.$vuetify.breakpoint.lgOnly ? 
            'question-large' : 
            'question-xlarge'
        )
    },
    supportStatus () {
      return this.tab === 0 ? [
        {
          displayName: 'Pending',
          value: 'pending'
        },
        {
          displayName: 'In progress',
          value: 'in progress'
        }
      ] : [
        {
          displayName: 'Pending',
          value: 'pending'
        },
        {
          displayName: 'In progress',
          value: 'in progress'
        },  
        {
          displayName: 'Closed',
          value: 'closed'
        }
      ]
    },
    isAdmin () {
      return !!(this.$store.getters.user || {}).isAdmin
    }
  },
  methods: {
    capitalize: capitalize,
    dispatchAndToast (promise, actionText) {
      return promise
        .catch(error => {
          this.$store.dispatch('showToast', {info: `${actionText} failed` + error.message})
        })
    },
    showStatus (status) {
      return (this.supportStatus.find(({value}) => value === status) || {}).displayName || status
    },
    addNewSupport () {
      this.supportEditorToggle = true
      this.supportInEdit = {}
    },
    checkNewComment (request) {
      let lastReadTime = request[`lastRead_${this.$store.getters.uid}`]
      let hasOnlyInitialComment = request.comments && request.comments.length === 1 && request.comments[0].initialComment
      let lastMessageTime = request.comments && request.comments.length > 0 && request.comments.slice(-1)[0].createTime

      return !hasOnlyInitialComment && !!lastMessageTime && (!lastReadTime || lastReadTime < lastMessageTime)
    },
    checkNewInternalComment (request) {
      let lastReadTime = request[`lastRead_internalComments_${this.$store.getters.uid}`]
      let hasOnlyInitialComment = request.internalComments && request.internalComments.length === 1 && request.internalComments[0].initialComment
      let lastMessageTime = request.internalComments && request.internalComments.length > 0 && request.internalComments.slice(-1)[0].createTime

      return !hasOnlyInitialComment && !!lastMessageTime && (!lastReadTime || lastReadTime < lastMessageTime)
    },
    showCommentsDialog (item) {
      this.supportInEdit = item
      if (this.supportInEdit.agentUid) {
        this.agentName = this.supportInEdit.agentName
      } else {
        this.agentName = ''
      }
      this.supportInEditNewStatus = this.supportInEdit.status
      this.commentsDialog = true
    },
    showInternalCommentsDialog (item) {
      this.supportInEdit = item
      if (this.supportInEdit.agentUid) {
        this.agentName = this.supportInEdit.agentName
      } else {
        this.agentName = ''
      }
      this.supportInEditNewStatus = this.supportInEdit.status
      this.internalCommentsDialog = true
    },
    cancelSupport (item) {
      if (confirm('Are you sure to cancel this support')) {
        this.dispatchAndToast(this.$store.dispatch('cancelSupport', item))
      }
    },
    updateSupportStatus (payload = {
      status: this.supportInEditNewStatus,
      key: this.supportInEdit._key,
      agentUid: '',
      agentName: ''
    }) {
      if (payload.status === 'in progress' || payload.status === 'closed') {
        payload.agentUid = this.user.uid
        payload.agentName = this.agentName
        payload.keywords = [...this.supportInEdit.keywords, this.user.uid]
        payload.status === 'closed' && (payload.closedTime = new Date())
      }
      return this.dispatchAndToast(this.$store.dispatch('updateSupport', payload))
        .then(() => {
          if (payload.status === 'closed') {
            this.commentsDialog = false
          }
        })
    },
    lastCommentPreview (item) {
      let lastComment = item.comments[item.comments.length - 1].content || ''
      return lastComment.split('\n')[0] + (lastComment.split('\n')[0] ? '…' : '')
    },
    agentDisplay (item) {
      if (item.agentName) return item.agentName
      else if (!item.agentUid) return ''
      else return '' 
    },
    getOrgId (tenantKey = '') {
      return this.$store.getters.organizationKeyToId.get(tenantKey) || ''
    },
    /** @param {FsFile} file */
    downloadFile (file) {
      return this.$store.dispatch('downloadFile', file)
    },
    showResolvePopup () {
      this.resolveDialogFlag = true
    }
  }
}
</script>

<style>
.chatroom-op {
  padding-top: 0;
}

.badge {
  font-size: 10px;
}

.question-medium {
  overflow-wrap: break-word !important;
  max-width: 20vw
}
.question-large {
  overflow-wrap: break-word !important;
  max-width: 30vw
}
.question-xlarge {
  overflow-wrap: break-word !important;
  max-width: 40vw
}
</style>
