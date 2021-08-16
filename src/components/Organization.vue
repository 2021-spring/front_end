<template>
  <v-container fluid>
    <v-layout>
      <v-flex >
        <v-layout class="headline">Organizations</v-layout>
      </v-flex>
    </v-layout>
    <v-tabs
        color="transparent"
        v-model="tab"
        show-arrows
      >
        <v-tabs-slider color="primary"></v-tabs-slider>
        <v-tab v-for="(tabItem, index) in tabs" :key="tabItem">
          <v-badge class="notification" :value="index === 1 && requests.length > 0" color="red">
            <template v-slot:badge>
              <div dark></div>
            </template>
            <span class="tabItem">{{ tabItem }}</span>
          </v-badge>
        </v-tab>
        <v-tabs-items v-model="tab" touchless>
          <v-tab-item v-for="(item, index) in tabs.length" :key="'item' + index">
            <v-layout v-if="index === 1 && tab === 1">
              <v-flex class="mt-3 mb-1 ml-2" style="color: gray">Input an organization ID, and press "Enter" key to apply the change</v-flex>
            </v-layout>
            <v-data-table
              v-if="index === 1 && tab === 1"
              :headers="headers"
              :items="requests"
              item-key="key"
              class="elevation-2 myDense"
              :loading="processing"
            >
              <template v-slot:items="{item}">
                <td>{{item.tenantName}}</td>
                <td class="text-xs-left">{{ item.email }}</td>
                <td class="text-xs-left">{{ toTimestampString(item.createTime) }}</td>
                <td class="text-xs-left">
                  <v-layout row no-wrap align-baseline>
                    <v-flex md6>
                      <v-text-field
                        v-model="item.organizationId"
                        :idx="item.key"
                        @keyup.enter="addId(item)"
                        clearable
                      ></v-text-field>
                    </v-flex>
                    <v-flex md3>
                      <v-btn color="primary" @click="setRandomOrgId(item)">Generate</v-btn>
                    </v-flex>
                  </v-layout>
                </td>
                <td class="text-xs-center">
                  <v-btn color="primary" v-if="item.organizationId" flat dark icon @click="addId(item)"><v-icon dark>save</v-icon></v-btn>
                  <v-btn color="red" flat dark icon @click="removeOrgRequest(item)"><v-icon dark>cancel</v-icon></v-btn>
                </td>
              </template>
            </v-data-table>
            <v-layout v-if="index === 0 && tab === 0" align-baseline>
              <v-flex lg3 xs4>
                <v-btn id="cancelUpdate" v-if="isEditMode" color="secondary" :disabled="processing" @click.stop="cancelEditData()">
                  Cancel
                </v-btn>
                <v-btn id="editOrSave" color="primary" :disabled="processing" @click.stop="isEditMode ? saveEditData() : enterEditData()">
                  {{isEditMode ? 'Save' : 'Edit'}}
                </v-btn>
              </v-flex>
              <v-flex md2 v-for="num in [0, 1, 2]" :key="num">
                {{ getExpenseHeader(num) }}: ${{ totalExpense3Months[num].toLocaleString() }}
              </v-flex>
              <v-flex class="text-xs-left errorFont" v-if="updateErrMsg">{{updateErrMsg}}</v-flex>
              <v-spacer></v-spacer>
              <v-flex sm6 md3 lg2>
                <v-text-field
                  append-icon="search"
                  label="Search"
                  single-line
                  hide-details
                  v-model="search"
                  clearable
                ></v-text-field>
              </v-flex>
            </v-layout>
            <v-data-table
              v-if="index === 0 && tab === 0"
              :headers="headers"
              :items="isEditMode ? cachedOrgs : organizations"
              item-key="key"
              :search="search"
              class="elevation-2 myDense"
              :pagination.sync="pagination"
              :rows-per-page-items="rowPerPage"
              :loading="processing"
            >
              <template v-slot:headerCell="props">
                <template v-if="props.header.text === 'Waiver'">
                  <v-layout justify-space-around>Waiver</v-layout>
                  <v-divider></v-divider>
                  <v-layout justify-space-between>
                    <v-flex md3>In</v-flex>
                    <v-flex md3>Out</v-flex>
                    <v-flex md3>Storage</v-flex>
                  </v-layout>
                </template>
                <template v-else>{{ props.header.text }}</template>
              </template>
              <template v-slot:items="{item}">
                <td><v-layout><strong>{{item.tenantName}}</strong></v-layout><v-layout>({{item.email}})</v-layout></td>
                <td class="text-xs-left">{{item.createTime ? toTimestampString(item.createTime) : '09/01/2019 00:00*'}}</td>
                <td class="text-xs-left">
                  <template v-if="isEditMode">
                    <v-flex sm10>
                      <v-text-field
                      v-model="item.organizationId"
                      :disabled="processing"></v-text-field>
                    </v-flex>
                  </template>                  
                  <template v-else>{{ item.organizationId }}</template>
                </td>
                <td class="text-xs-left">${{ item.balance }}</td>
                <td class="text-xs-left">${{ item.expense0 }}</td>
                <td class="text-xs-left">${{ item.expense1 }}</td>
                <td class="text-xs-left">${{ item.expense2 }}</td>
                <td class="text-xs-left">
                  <template v-if="isEditMode">
                    <v-flex sm10>
                      <v-text-field
                      v-model="item.accountManager"
                      :disabled="processing"></v-text-field>
                    </v-flex>
                  </template>                  
                  <template v-else>{{ item.accountManager }}</template>
                </td>
                <td class="text-xs-left">
                  <template v-if="isEditMode">
                    <v-flex sm10>
                      <v-autocomplete
                        :items="tierDiscounts"
                        item-text="displayName"
                        item-value="key"
                        v-model="item.discountKey"
                        :disabled="processing"
                        clearable></v-autocomplete>
                    </v-flex>
                  </template>
                  <template v-else>{{ getDiscountName(item) }}</template>
                </td>
                <td class="text-xs-left">
                  <template v-if="isEditMode">
                    <v-layout justify-space-between>
                        <v-flex md3 v-for="waive in waiveTypes" :key="waive">
                          <v-checkbox :disabled="processing" v-model="item.waives" :value="waive" />
                        </v-flex>
                    </v-layout>
                  </template>
                  <template v-else>
                    <v-layout justify-space-between>
                        <v-flex md3 v-for="waive in waiveTypes" :key="waive">
                          <v-icon v-if="item.waives.includes(waive)">done</v-icon>
                        </v-flex>
                    </v-layout>
                  </template>
                </td>
                <td class="text-xs-center">
                  <v-layout align-center>
                    <v-btn color="primary" flat dark small @click="showExpenseHistoryDialog(item)">History</v-btn>
                    <v-menu offset-y>
                      <template v-slot:activator="{ on }">
                        <v-btn small @click.stop="on.click" dark flat color="primary">
                          More<v-icon>expand_more</v-icon>
                        </v-btn>
                      </template>
                      <v-list>
                        <v-list-tile @click.stop="saveBarcodeFile(item.organizationId)">
                          <v-list-tile-title>Barcode</v-list-tile-title>
                        </v-list-tile>
                        <v-list-tile v-if="hasAuthToFunctionality('warehouseAdjustBalance')" @click.stop="showBillingChangeDialog(item)">
                          <v-list-tile-title>Adjust</v-list-tile-title>
                        </v-list-tile>
                        <v-list-tile @click.stop="showBillingDetailDialog(item)">
                          <v-list-tile-title>Detail</v-list-tile-title>
                        </v-list-tile>
                      </v-list>
                    </v-menu>
                  </v-layout>
                </td>
              </template>
            </v-data-table>
            <!-- Setting Tabs -->
            <v-layout 
              v-if="index === 2 && tab === 2"
              row wrap
            >
              
              <v-flex xs12>
                <!-- template hints -->
                <v-layout class="headline" justify-start align-baseline>
                  <v-flex xs6 md3 lg2>Settings</v-flex>
                  <v-flex>
                    <v-btn
                      v-if="orgSettingsState.isChange"
                      color="secondary" 
                      :disabled="processing"
                      @click.stop="setOrgSettings()"
                    >Cancel</v-btn>
                    <v-btn
                      color="primary"
                      v-if="orgSettingsState.isChange"
                      :disabled="orgSettingsState.isSaveDisabled"
                      @click="saveOrgSettingsChange()"
                    >Save</v-btn>
                  </v-flex>
                </v-layout>
                <v-card>
                  <v-card-text>
                    <v-layout>
                      <v-flex 
                        v-if="warehouseInfo && warehouseInfo.limitOrgNum >= 1"
                        style="padding: 0px 20px;"
                      >
                        This warehouse can connect maximum {{warehouseInfo.limitOrgNum}} organization(s).
                      </v-flex>
                    </v-layout>
                    <v-container fluid grid-list-lg>
                      <v-layout row wrap>
                        <v-flex xs6 sm4 lg3 xl2 v-if="warehouseInfo && warehouseInfo.limitOrgNum > 5">
                          <v-checkbox 
                            label="List warehouse" 
                            v-model="isListed"
                          ></v-checkbox>
                        </v-flex>
                        <v-flex xs6 sm3 lg2 xl1>
                          <v-layout row no-wrap>
                            <v-text-field
                              name="orgIdLength"
                              ref="orgIdLength"
                              label="organization ID length"
                              :rules="[fieldIsInteger('Org ID length'), fieldIsOverZero('Org ID length')]"
                              v-model.number="orgSettingsInEdit.orgIdGenerateLength"
                            ></v-text-field>
                          </v-layout>
                        </v-flex>
                      </v-layout>
                    </v-container>
                  </v-card-text>
                </v-card>
              </v-flex>
              
              <v-flex xs12 mt-2>
                <v-layout class="headline" justify-start  align-baseline>
                  <v-flex xs6 md3 lg2>Templates</v-flex>
                  <v-flex>
                    <v-btn id="cancelUpdate" v-if="isEditMode" color="secondary" :disabled="processing" @click.stop="cancelEditTemplate()">
                      Cancel
                    </v-btn>
                    <v-btn id="editOrSave" color="primary" :disabled="processing" @click.stop="isEditMode ? saveTemplate() : enterEditTemplate()">
                      {{isEditMode ? 'Save' : 'Edit'}}
                    </v-btn>
                  </v-flex>
                </v-layout>
                <v-card>
                  <v-card-text>
                    <v-container fluid grid-list-lg>
                      <v-layout justify-space-between wrap>
                        <v-flex xs12 md2 lg1 title>Data</v-flex>
                        <v-flex text-xs-left>
                          <v-chip dark color="info" v-for="item in ['orgName', 'orgId', 'warehouse', 'sampleAddress']" :key="item">{{item}}</v-chip>
                        </v-flex>
                      </v-layout>
                      <v-layout justify-start align-center wrap>
                        <v-flex xs12 md2 lg1 title>Example</v-flex>
                        <div class="ml-3">Dear #{orgName}</div>
                        <v-flex xs2 md1 text-xs-center>
                          <v-icon>arrow_right_alt</v-icon>
                        </v-flex>
                        <div
                          v-text="templateCompiler(
                            'Dear #{orgName}', 
                            {orgName: 'New Tenant'}
                          )"
                        />         
                      </v-layout>
                      <v-layout justify-space-between>
                        <v-flex md6 xs12 pa-3>
                          <v-layout class="headline">Approved</v-layout>
                          <template v-if="isEditMode">
                            <v-flex xs12>
                              <v-textarea
                                label="Approved email"
                                v-model="templatesInEdit.approved.template"
                                rows="12"
                                outline
                              />
                            </v-flex>
                            <v-flex xs12 v-if="templatesInEdit.approved.attachments.length">
                              <b>Attachment:</b>
                              <br />
                              <v-chip
                                dark
                                color="info"
                                v-for="attachment in templatesInEdit.approved.attachments" 
                                :key="attachment.name"
                                close
                                @input="removeAttachment(attachment)"
                              >
                                {{attachment.name}}
                              </v-chip>
                            </v-flex>
                            <v-flex xs12>
                              <p>Attachments upload limit: 3</p>
                              <UploadFileWidget
                                v-model="uploadedFiles"
                                type="emailAttachemnts"
                                :maxFiles="3 - templatesInEdit.approved.attachments.length"
                                :clearFiles="clearFiles"
                              ></UploadFileWidget>
                            </v-flex>
                          </template>
                          <v-flex
                            xs12 
                            class="template-display"
                            v-else
                            v-text="templateCompiler(
                              emailTemplates.approved.template, 
                              templateVariables
                            )"
                            v-linkified
                          />
                          <v-flex xs12 v-if="!isEditMode && emailTemplates.approved.attachments.length">
                            <b>Attachment:</b>
                            <br />
                            <v-chip
                              dark
                              color="info" 
                              v-for="attachment in emailTemplates.approved.attachments" 
                              :key="attachment.name"
                            >
                              {{attachment.name}}
                            </v-chip>
                          </v-flex>
                        </v-flex>
                        <v-flex md6 xs12 pa-3>
                          <v-layout class="headline">Rejected</v-layout>
                          <v-flex xs12 v-if="isEditMode">
                            <v-textarea
                              v-if="isEditMode"
                              label="Rejected email"
                              v-model="templatesInEdit.rejected.template"
                              rows="12"
                              outline
                            />
                          </v-flex>
                          <v-flex xs12 
                            class="template-display"
                            v-else
                            v-text="templateCompiler(
                              emailTemplates.rejected.template,
                              templateVariables
                            )"
                            v-linkified
                          />
                        </v-flex>
                      </v-layout>
                    </v-container>
                  </v-card-text>
                </v-card>
              </v-flex>
            </v-layout>
          </v-tab-item>
        </v-tabs-items>
    </v-tabs>
    <ExpenseHistoryPopup
      v-if="expenseHistoryDialog"
      v-model="expenseHistoryDialog"
      :expenseHistory="expenseHistory"/>
    <BillingDetails
      v-model="billingDetailDialog"
      v-if="billingDetailDialog"
      :tenantKey="orgInEdit.key"/>
    <BillingChange
      v-model="billingChangeDialog"
      v-if="billingChangeDialog"
      :organization="orgInEdit"/>
  </v-container>
</template>

<script>
import ExpenseHistoryPopup from './ExpenseHistoryPopup'
import UploadFileWidget from './UploadFileWidget'
import {deepEqual, timeTools, getDefaultEmailTemplates, checkRules, getRandOrgId, saveBarcodeImage, toMoney} from '@/utils/tools'
import EmailBodyBuilder, { createSiteAddressSample } from '../utils/EmailBodyBuilder'
import add from 'date-fns/add'
import BillingDetails from './BillingDetails'
import BillingChange from './BillingChange'

export default {
  name: 'organization',
  components: {
    BillingDetails,
    BillingChange,
    ExpenseHistoryPopup,
    UploadFileWidget
  },
  mixins: [timeTools, checkRules],
  data () {
    return {
      tab: 0,
      tabs: ['Active', 'Requests', 'Settings'],
      requests: [],
      processing: false,
      expenseHistoryDialog: false,
      rowPerPage: [30, 100, {text: 'All', value: -1}],
      pagination: {
        sortBy: 'expense0',
        descending: true
      },
      search: '',
      isEditMode: false,
      cachedOrgs: [],
      historyHeaders: [
        { text: 'ID#', align: 'left', sortable: false, value: 'key' },
        { text: 'Date', value: 'dateKeyStr', align: 'left', sortable: false },
        { text: 'Expense', value: 'expense', align: 'left', sortable: false }
      ],
      expenseHistory: [],
      waiveTypes: ['inbound', 'outbound', 'storage'], // don't change name
      waives: [],
      templateVariables: { // only for display
        orgName: 'New tenant',
        orgId: 'NT',
        warehouse: this.$store.getters.warehouseName,
        sampleAddress: this.simpleSite('NT')
      },
      templatesInEdit: {},
      uploadedFiles: [],
      clearFiles: false,
      orgSettings: { 
        // just show default value , concat with serverside data
        // if set nest obj / array, must deepClone 
        orgIdGenerateLength: 3
      },
      orgSettingsInEdit: {},
      orgSettingsState: {isChange: false, isSaveDisabled: true},
      updateErrMsg: '',
      isListed: !!this.$store.getters.warehouseLimitedInfo.isListed,
      billingDetailDialog: false,
      billingChangeDialog: false,
      orgInEdit: {}
    }
  },
  beforeMount () {
    this.loadSignupRequests()
    this.setOrgSettings()
  },
  watch: {
    tab (newVal, oldVal) {
      if (oldVal === 0 && this.isEditMode) {
        if (this.changedOrgs.length > 0) {
          if (confirm('You have changes not saved yet. Do you want to save and leave?')) {
            this.saveEditData()
          } else {
            this.$nextTick(() => { this.tab = oldVal })
          }
        } else {
          this.cancelEditData(true)
        }
      } else if (oldVal === 1) this.requests.forEach(request => { request.organizationId = '' })
      if (oldVal === 2 || newVal === 2) {
        this.orgSettingsInEdit = {...this.orgSettings}
        this.orgSettingsState.isChange = false
      }
    },
    orgSettingsInEdit: {
      handler: function (newVal, oldVal) {
        this.orgSettingsState.isChange = false
        for (const key in newVal) {
          if (newVal[key] !== this.orgSettings[key]) {
            this.orgSettingsState.isChange = true
            break
          }
        }
        if (this.$refs.orgIdLength && this.$refs.orgIdLength[0]) {
          this.orgSettingsState.isSaveDisabled = !this.$refs.orgIdLength[0].validate()
        }
      },
      deep: true
    },
    isListed (val) {
      this.$store.dispatch('updateWarehouseLimitedInfo', val)
    }
  },
  computed: {
    limitedInfo () {
      return this.$store.getters.warehouseLimitedInfo
    },
    organizations () {
      return this.$store.getters.tenantsWithBillings.map(org => {
        return {
          ...org,
          expense0: this.getExpense(org.expenseHistory, 0),
          expense1: this.getExpense(org.expenseHistory, 1),
          expense2: this.getExpense(org.expenseHistory, 2)
        }
      })
    },
    orgAssignedIds () {
      return this.organizations.map(({organizationId}) => organizationId)
    },
    tierDiscounts () {
      return this.$store.getters.tierDiscounts
    },
    headers () {
      return this.tab === 0 ? [
        { text: 'Name', value: 'tenantName', align: 'left', sortable: true },
        { text: 'Start time', value: 'createTime', align: 'left', sortable: false },
        { text: 'Organization ID', value: 'organizationId', align: 'left', sortable: true },
        { text: 'Balance', value: 'balance', align: 'left', sortable: true },
        { text: `${this.getExpenseHeader(0)}`, value: 'expense0', align: 'left', sortable: true },
        { text: `${this.getExpenseHeader(1)}`, value: 'expense1', align: 'left', sortable: true },
        { text: `${this.getExpenseHeader(2)}`, value: 'expense2', align: 'left', sortable: true },
        { text: 'Account manager', value: 'accountManager', align: 'left', sortable: true },
        { text: 'Discount tier', value: 'discount', align: 'left', sortable: false },
        { text: 'Waiver', value: 'discount', align: 'left', sortable: false },
        { text: 'Action', value: 'email', align: 'center', sortable: false, width: '14%' }
      ] : [
        { text: 'Name', value: 'tenantName', align: 'left', sortable: false },
        { text: 'Email', value: 'email', align: 'left', sortable: false },
        { text: 'Request time', value: 'createTime', align: 'left', sortable: false },
        { text: 'Organization ID', value: 'organizationId', align: 'left', sortable: false },
        { text: 'Action', value: '', width: '12%', align: 'center', sortable: false }
      ]
    },
    changedOrgs () {
      return this.cachedOrgs.filter(org => {
        let oldOrg = this.organizations.find(oldOrgObj => oldOrgObj.key === org.key)

        let compareRtn = org.organizationId !== oldOrg.organizationId 
          || org.discountKey !== oldOrg.discountKey 
          || !deepEqual(org.waives, oldOrg.waives)
          || org.accountManager !== oldOrg.accountManager

        return compareRtn
      })
    },
    emailTemplates () {
      return this.$store.getters.warehouseEmailTemplates || getDefaultEmailTemplates()
    },
    warehouseInfo () {
      return this.$store.getters.warehouseInfo
    },
    totalExpense3Months () {
      return [0, 1, 2].map((num) => {
        return toMoney(this.$store.getters.tenantsWithBillings.reduce((acc, item) => {
          return acc + this.getExpense(item.expenseHistory, num)
        }, 0))
      }) 
    }
  },
  methods: {
    loadSignupRequests () {
      return this.$store.dispatch('loadSignupWarehouseRequests')
        .then(requests => { this.requests = requests })
    },
    enterEditData () {
      this.cachedOrgs = this.organizations && this.organizations.length ? 
        this.organizations.map(org => { return {...org} }) : 
        []
      this.isEditMode = true
    },
    leaveEditMode () {
      this.isEditMode = false
      this.cachedOrgs = []
      this.processing = false
      this.setUpdateErrMsg()
    },
    cancelEditData (isNoWarning) {
      if (!isNoWarning && this.changedOrgs.length > 0 && !confirm('Do you want to cancel all changes?')) return
      this.leaveEditMode()
    },
    saveEditData () {
      if (this.hasDuplicateId(this.cachedOrgs)) {
        alert('Duplicated ID is not allowed')
        return
      }
      let addedOrgs = this.organizations.reduce((acc, org) => {
        if (org.organizationId === '' &&
          this.cachedOrgs.find(item => item.key === org.key).organizationId !== '') {
          return acc + 1
        } else if (org.organizationId !== '' &&
          this.cachedOrgs.find(item => item.key === org.key).organizationId === '') {
          return acc - 1
        }
        return acc
      }, 0)
      if (this.orgAssignedIds.filter(item => item).length >= this.warehouseInfo.limitOrgNum &&
        addedOrgs > 0) {
        return alert('Organization number has exceeded limit.')
      }
      if (this.changedOrgs.length === 0) {
        this.processing = false
      }

      this.processing = true
      let newRequests = []
      let removeRequests = []

      this.requests.forEach(request => {
        if (this.changedOrgs.some(({key}) => request.tenantKey === key)) {
          removeRequests.push(request)
        } else {
          newRequests.push(request)
        }
      })
      this.setUpdateErrMsg()
      return Promise.all(this.changedOrgs.map(org => this.$store.dispatch('updateOrganization', org)))
        .catch(err => {
          this.setUpdateErrMsg('Update organization failed')
          throw err
        })
        .then(() => this.leaveEditMode() || Promise.all(removeRequests.map(req =>
          this.$store.dispatch('removeOrgWarehouseRequest', req)
        )))
        .then(() => {
          this.requests = newRequests
        })
        .finally(() => {
          this.processing = false
        })
    },
    getDiscountName (item) {
      let discountLevel = item.discountKey && this.tierDiscounts.find(discount => discount.key === item.discountKey)
      return discountLevel && discountLevel.displayName
    },
    translateTemplateVariable (org = {}) {
      const {tenantName, organizationId} = org
      return {
        orgName: tenantName,
        orgId: organizationId,
        warehouse: this.$store.getters.warehouseName,
        sampleAddress: this.simpleSite(organizationId)
      }
    },
    addId (item) {
      if (this.orgAssignedIds.filter(item => item).length >= this.warehouseInfo.limitOrgNum) {
        return alert('Organization number has exceeded limit.')
      }
      let {organizationId = '', tenantName = '', email = '', tenantKey, key} = item
      if (!organizationId) return  
      let org = {
        id: tenantKey,
        requestId: key,
        organizationId,
        tenantName,
        email
      }
      if (this.hasDuplicateId([...this.organizations, org])) {
        alert('Duplicated ID is not allowed')
        return
      }
      this.processing = true
      return this.$store.dispatch('updateOrganization', org)
        .then(() => {
          this.$store.dispatch('sendMail', {
            subject: 'Your warehouse signup request has been approved',
            body: {
              template: this.emailTemplates.approved.template,
              variables: this.translateTemplateVariable(org),
              attachments: this.emailTemplates.approved.attachments
            },
            recievers: [email]
          })
        })
        .then(() => {
          this.processing = false
          this.loadSignupRequests()
        })
        .finally(() => {
          this.processing = false
        })
    },
    hasDuplicateId (orgs) {
      return orgs.some((org, index) => {
        return org.organizationId && (orgs.findIndex(item => item.organizationId.toUpperCase() === org.organizationId.toUpperCase()) !== index)
      })
    },
    showExpenseHistoryDialog (item) {
      this.expenseHistory = item.expenseHistory
      this.expenseHistoryDialog = true
    },
    removeOrgRequest (item) {
      if (!confirm('Are you sure to reject?')) return
      const {key = ''} = item
      return this.$store.dispatch('removeOrgWarehouseRequest', {key})
        .then(() => { 
          this.$store.dispatch('sendMail', {
            recievers: [item.email],
            subject: 'Your warehouse signup request has been rejected',
            body: {
              template: this.emailTemplates.rejected.template,
              variables: this.translateTemplateVariable(item)
            }
          })
          this.loadSignupRequests()
        })
    },
    templateCompiler (string, data) {
      return new EmailBodyBuilder(string, data).toString()
    },
    cancelEditTemplate () {
      const currentAttachments = this.templatesInEdit.approved.attachments
      const originAttachments = this.emailTemplates.approved.attachments
      // remove new add files
      this.uploadedFiles.forEach(file => {
        this.$store.dispatch('removeFile', file.fullPath)
      })
      if (originAttachments.length !== currentAttachments.length) {
        let payload = {...this.emailTemplates}
        payload.approved.attachments = currentAttachments
        this.$store.dispatch('setEmailTemplates', payload)
      }
      this.isEditMode = false
      this.templatesInEdit = {}
    },
    async saveTemplate () {
      // format template save to firebase
      const attachments = [
        ...this.templatesInEdit.approved.attachments,
        ...this.uploadedFiles
      ]
      this.templatesInEdit.approved.attachments = await Promise.all(
        attachments.map(async attachment => {
          if (attachment.downloadURL) return attachment
          let fullUrl = await this.$store.dispatch('getStorageFileUrl', attachment)
          return {...attachment, downloadURL: fullUrl}
        })
      )
      return this.$store.dispatch('setEmailTemplates', this.templatesInEdit)
        .then(() => {
          this.isEditMode = false
          this.templatesInEdit = {}
        })
    },
    enterEditTemplate () {
      this.templatesInEdit = {...this.emailTemplates}
      this.uploadedFiles = []
      this.isEditMode = true
    },
    removeAttachment (file) {
      return this.$store.dispatch('removeFile', file.fullPath)
        .then((res) => {
          this.templatesInEdit.approved.attachments =
            this.templatesInEdit.approved.attachments
              .filter(({name}) => name !== file.name)
        })
        .catch(err => {
          if (err.code === 'storage/object-not-found') {
            this.templatesInEdit.approved.attachments =
              this.templatesInEdit.approved.attachments
                .filter(({name}) => name !== file.name)
          } else throw err
        })
    },
    simpleSite (orgId = '') {
      if (!orgId) return ''
      return createSiteAddressSample(this.$store.getters.warehousesSites, orgId)
    },
    saveOrgSettingsChange () {
      return this.$store.dispatch('saveOrgSettingsChange', this.orgSettingsInEdit)
        .then(() => this.setOrgSettings())
    },
    setOrgSettings () {
      this.orgSettings = {
        ...this.orgSettings,
        ...(this.$store.getters.warehouseOrgSettings || {})
      }
      this.orgSettingsInEdit = {...this.orgSettings}
    },
    setRandomOrgId (request) {
      let digits = this.orgSettings.orgIdGenerateLength || 3
      let newOrgId
      request.organizationId = ''
      const assignedIds = this.getAllAssignedIds()
      const orgIdUsePercents = assignedIds.length / Math.pow(26, digits) 
      if (orgIdUsePercents >= 1) {
        return alert(`${digits} digits IDs is empty, plz change the generate id length`)
      } else if (orgIdUsePercents > 0.9 && 
        !confirm(`${digits} digits IDs is almost empty, do you want to continue?`)
      ) {
        return
      } else {
        newOrgId = getRandOrgId(digits)
        while (assignedIds.includes(newOrgId)) {
          newOrgId = getRandOrgId(digits)
        }
      }
      this.$set(request, 'organizationId', newOrgId)
    },
    getAllAssignedIds () {
      return [
        ...this.orgAssignedIds,
        ...this.requests.map(({organizationId}) => organizationId).filter(id => id)
      ]
    },
    setUpdateErrMsg (msg = '') {
      this.updateErrMsg = msg
    },
    saveBarcodeFile (orgId) {
      const prefix = '*#*#-'
      return saveBarcodeImage(prefix + orgId, orgId)
    },
    getExpense (expenseHistory, num) {
      if (!expenseHistory) return 0
      let currentTime = add(new Date(), {months: -num})
      let curKeyStr = `${currentTime.getFullYear()}-${currentTime.getMonth() + 1}`
      let target = expenseHistory.find(item => item.dateKeyStr === curKeyStr)
      return target ? target['expense'] : 0
    },
    getExpenseHeader (num) {
      let currentTime = add(new Date(), {months: -num})
      return `${currentTime.getFullYear()}-${currentTime.getMonth() + 1} Exp`
    },
    showBillingDetailDialog (item) {
      this.orgInEdit = item
      this.billingDetailDialog = true
    },
    showBillingChangeDialog (item) {
      this.orgInEdit = item
      this.billingChangeDialog = true
    }
  }
}
</script>

<style>
.notification .v-badge__badge{
  width: 5px;
  height: 5px;
  top: -3px;
  right: -5px;
}
.template-display {
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-all;
}
.errorFont {
  color: red;
}
</style>
