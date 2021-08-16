<template>
  <v-container fluid>
    <v-tabs
        color="transparent"
        v-model="tab"
        show-arrows
      >
        <v-tabs-slider color="primary"></v-tabs-slider>
        <v-tab v-for="tabItem in tabs" :key="tabItem">      
          {{ tabItem }}
        </v-tab>
      <v-tabs-items v-model="tab" touchless>
        <v-tab-item v-for="(item, index) in tabs.length" :key="'item' + index">
          <TaskTable 
            v-if="index === 0 && !isOrganization"
            :isRealtime="!isOrganization"
            :Tasks="active"
            :firstActionText="firstActionText"
            :secondActionText="secondActionText"
            :firstFunc="firstFunc"
            :secondFunc="secondFunc"
            :filteredItems.sync="filteredTasks"></TaskTable>
          
          <PaginationController
            v-if="index === 0 && isOrganization"
            v-model="tenantActiveTasks"
            getDataActionName="getActiveTasksPagination"
            :historyLimit="historyLimit"
            :haveStartDate="true"
            :haveSearchBox="true"
            :searchBoxLabel="'User name / offer id / keyword'"
          >
            <template v-slot:dataTable>
              <v-data-table
                :headers="tenantActiveTaskHeaders"
                :items="tenantActiveTasksWithSites"
                item-key="paginationKey"
                class="elevation-2 myDense"
                ref="TaskTable"
                hide-actions>
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
                  <td class="text-xs-center">{{ props.item.quantity }}</td>
                  <td class="text-xs-left">{{ toTimestampString(props.item.createTime) }}</td>
                  <td class="justify-center">
                    <v-layout justify-center wrap>
                      <v-btn v-if="firstFunc" dark color="primary" flat @click.stop="firstFunc(props.item, props.index)" :id="`confirmTask${props.index + 1}`">{{firstActionText}}</v-btn>
                      <v-btn v-if="secondFunc" dark color="secondary" flat @click.stop="secondFunc(props.item)">{{secondActionText}}</v-btn>
                    </v-layout>
                  </td>
              </template>
              </v-data-table>
            </template>
          </PaginationController>
          <PaginationController
            v-if="index === 1 && tab === 1"
            v-model="taskHistory"
            getDataActionName="getHistoryTasksPagination"
            :historyLimit="historyLimit"
            :haveSearchBox="true"
            :haveStartDate="true"
            :searchBoxLabel="isOrganization ? 'Product name / Offer id / Member name / Tracking' : 'Product name / Offer id / Org name / Tracking'"
            :searchBoxHint="'support tracking number or up to two consecutive keywords in product name'">
            <template v-slot:dataTable>
              <v-data-table
                :headers="historyHeaders"
                :items="taskHistory"
                item-key="paginationKey"
                class="elevation-2 myDense"
                ref="TaskTable"
                :expand="expand"
                hide-actions>
                <template v-slot:items="props">
                  <tr @click="props.expanded = !props.expanded">
                    <td class="subheading">{{ props.index + 1}}</td>
                    <td class="text-xs-left">{{ props.item.offerKey }}</td>
                    <td class="text-xs-left">{{ isOrganization ? props.item.userName : props.item.tenantName }}</td>
                    <td class="text-xs-left body-2">
                      {{(props.item.productCondition ? props.item.productCondition.toUpperCase() : '') + ' - ' + props.item.productName + (props.item.isPropose ? ' [Proposed]' : '')}}
                      <div :class="trackNumsClass">{{props.item.trackingConfirmed && props.item.trackingConfirmed.join(', ')}}</div>
                    </td>
                    <td class="text-xs-left">{{ props.item.warehouse }}</td>
                    <td class="text-xs-left">{{ '$' + (parseFloat(props.item.price) + (props.item.warehouse === 'self' ? parseFloat(props.item.bonus) : 0)) }}</td>
                    <td class="text-xs-center">{{ props.item.quantity}}</td>
                    <td class="text-xs-left">{{ toTimestampString(props.item.createTime) }}</td>
                  </tr>
                </template>
                <template v-slot:expand="props">
                  <v-card style="background-color: rgb(240, 240, 240)" v-if="props.item.packages && props.item.packages.length > 0">
                    <v-card-text style="margin-left: 20px;">
                      <template v-for="item in getMaxColumn(props.item.packages && props.item.packages.length)">
                        <div class="card-text-expand" :key="'pkg' + item">
                          <v-layout>
                            <v-flex sm7>Tracking</v-flex>
                            <v-flex sm2>Quantity</v-flex>
                            <v-flex sm3></v-flex>
                          </v-layout>
                        </div>
                        <!-- <div style="display: inline-block; width: 2vw;" :key="'space' + item"></div> -->
                      </template>
                      <br>
                      <v-divider></v-divider>
                      <template v-for="(pkg) in props.item.packages">
                        <div class="card-text-expand" :key="'pkg' + pkg.packageID">
                          <v-layout>
                            <v-flex sm7>{{pkg.trackingConfirmed && pkg.trackingConfirmed.join(' ')}}</v-flex>
                            <v-flex sm2>{{pkg.quantity}}</v-flex>
                            <v-flex sm3></v-flex>
                          </v-layout>
                        </div>
                        <!-- <div style="display: inline-block; width: 2vw;" :key="'space' + pkg.packageID"></div> -->
                      </template>
                    </v-card-text>
                  </v-card>
                </template>
              </v-data-table>
            </template>
          </PaginationController>
          <PaginationController
            v-if="index === 2 && tab === 2"
            v-model="canceledTaskHistory"
            getDataActionName="getCanceledTasksPagination"
            :historyLimit="historyLimit"
            :haveSearchBox="true"
            :haveStartDate="true"
            :searchBoxLabel="isOrganization ? 'Product name / Offer id / Member name' : 'Product name / Offer id / Org name'"
          >
            <template v-slot:dataTable>
              <v-data-table
                :headers="historyHeaders"
                :items="canceledTaskHistory"
                item-key="paginationKey"
                class="elevation-2 myDense"
                ref="TaskTable"
                :expand="expand"
                hide-actions>
                <template v-slot:items="props">
                  <tr @click="props.expanded = !props.expanded">
                    <td class="subheading">{{ props.index + 1}}</td>
                    <td class="text-xs-left">{{ props.item.offerKey }}</td>
                    <td class="text-xs-left">{{ isOrganization ? props.item.userName : props.item.tenantName }}</td>
                    <td class="text-xs-left body-2">
                      {{(props.item.productCondition ? props.item.productCondition.toUpperCase() : '') + ' - ' + props.item.productName + (props.item.isPropose ? ' [Proposed]' : '')}}
                      <div :class="trackNumsClass">{{props.item.trackingConfirmed && props.item.trackingConfirmed.join(', ')}}</div>
                    </td>
                    <td class="text-xs-left">{{ props.item.warehouse }}</td>
                    <td class="text-xs-left">{{ '$' + (parseFloat(props.item.price) + (props.item.warehouse === 'self' ? parseFloat(props.item.bonus) : 0)) }}</td>
                    <td class="text-xs-center">{{ props.item.cancelQuantity}}</td>
                    <td class="text-xs-left">{{ toTimestampString(props.item.createTime) }}</td>
                  </tr>
                </template>
                <template v-slot:expand="props">
                  <v-card style="background-color: rgb(240, 240, 240)" v-if="props.item.packages && props.item.packages.length > 0">
                    <v-card-text style="margin-left: 20px;">
                      <template v-for="item in getMaxColumn(props.item.packages && props.item.packages.length)">
                        <div class="card-text-expand" :key="'pkg' + item">
                          <v-layout>
                            <v-flex sm7>Tracking</v-flex>
                            <v-flex sm2>Quantity</v-flex>
                            <v-flex sm3></v-flex>
                          </v-layout>
                        </div>
                      </template>
                      <br>
                      <v-divider></v-divider>
                      <template v-for="(pkg) in props.item.packages">
                        <div class="card-text-expand" :key="'pkg' + pkg.packageID">
                          <v-layout>
                            <v-flex sm7>{{pkg.trackingConfirmed && pkg.trackingConfirmed.join(' ')}}</v-flex>
                            <v-flex sm2>{{pkg.quantity}}</v-flex>
                            <v-flex sm3></v-flex>
                          </v-layout>
                        </div>
                      </template>
                    </v-card-text>
                  </v-card>
                </template>
              </v-data-table>
            </template>
          </PaginationController>
        </v-tab-item>
      </v-tabs-items>
    </v-tabs>
    <TaskConfirm
      :title="`Confirm Task (#${taskInEdit.index + 1})`"
      v-model="confirmTaskDialog"
      v-if="confirmTaskDialog"
      :task="taskInEdit"
      :editMode="true"
      @getNextItem="getNextTask"
      @getPreviousItem="getPreviousTask"
      :isFirstTask="isFirstTask"
      :isLastTask="isLastTask"></TaskConfirm>
    <FormSubmitPopup
      :title="`Cancel task`"
      v-model="cancelTaskDialog"
      v-if="cancelTaskDialog"
      :rightButtonText="`Ok`"
      @popupClose="cancelTaskDialog = false"
      :rightMethod="cancelTask"
      :large="$vuetify.breakpoint.smAndDown">
      <template v-slot:input>
        <v-container>
          <v-layout>
            <v-flex>
              <v-text-field
                label="Quantity to cancel"
                v-model.number="cancelQuantity"
                autofocus
                class="required_field"
                :rules="quantityRules"
              ></v-text-field>
            </v-flex>
          </v-layout>
        </v-container>
      </template>
    </FormSubmitPopup>
    <TaskAddressWidget v-model="addressToggle" :sites="addressItems" />
  </v-container>
</template>

<script>
import TaskConfirm from './TaskConfirm'
import TaskTable from './TaskTable'
import PaginationController from './PaginationController'
import FormSubmitPopup from './FormSubmitPopup'
import TaskAddressWidget from './TaskAddressPopup'
import {timeTools, checkRules} from '../utils/tools'

export default {
  name: 'Task',
  components: {
    TaskTable,
    TaskConfirm,
    PaginationController,
    FormSubmitPopup,
    checkRules,
    TaskAddressWidget
  },
  mixins: [timeTools, checkRules],
  data () {
    return {
      tab: null,
      confirmTaskDialog: false,
      cancelTaskDialog: false,
      tabs: [ 'Active', 'History', 'Canceled' ],
      taskInEdit: {},
      firstActionText: '',
      secondActionText: '',
      firstFunc: null,
      secondFunc: null,
      historyLimit: 25,
      taskHistory: [],
      taskToCancel: {},
      cancelQuantity: 0,
      rowPerPage: [30, 50, 100, {text: 'All', value: -1}],
      searchTextSwitch: false,
      expand: false,
      quantityRules: [
        this.fieldIsRequired('quantity'),
        this.fieldIsInteger('quantity'),
        this.fieldIsNoLessThanZero('quantity'),
        v => v <= this.taskToCancel.quantity || `Must be smaller than remaining quantity (${this.taskToCancel.quantity})`
      ],
      filteredTasks: [],
      tenantActiveTaskHeaders: [
        { text: '#', align: 'left', sortable: false, width: '5%', value: 'note' },
        { text: 'Offer id', value: 'offerKey', align: 'left', sortable: false, width: '1%' },
        { text: 'Member', value: 'userName', align: 'left', sortable: false, width: '1%' },
        { text: 'Item', value: 'productName', align: 'left', sortable: false },
        { text: 'Send-to', value: 'warehouse', align: 'center', sortable: false, width: '1%' },
        { text: 'Price', value: 'price', align: 'left', sortable: false, width: '1%' },
        { text: 'Total qty', value: 'confirmedTotal', align: 'center', sortable: false, width: '1%' },
        { text: 'Unconfirmed qty', value: 'quantity', align: 'center', sortable: false, width: '1%' },
        { text: 'Create time', value: 'createTime', align: 'left', sortable: false, width: '1%' },
        { text: 'Action', value: 'trackingNums', align: 'center', sortable: false }
      ],
      tenantActiveTasks: [],
      addressItems: [],
      addressToggle: false,
      canceledTaskHistory: []
    }
  },
  mounted () {
  },
  watch: {
    tab (value) {
      switch (value) {
        case 0:
          this.firstActionText = this.isOrganization ? null : 'Confirm'
          this.secondActionText = 'Cancel'
          this.firstFunc = this.isOrganization ? null : this.showConfirmTaskDialog
          this.secondFunc = this.showCancelTaskDialog
          this.$store.dispatch('getAllTasks')
          break
        case 1:
          this.firstActionText = ''
          this.secondActionText = ''
          this.firstFunc = null
          this.secondFunc = null
          break
        default:
          break
      }
    },
    active: {
      handler: function (value) {
        let thisTask = this.filteredTasks.find(item => item.taskKey === this.taskInEdit.taskKey)
        if (thisTask) {
          let index = this.taskInEdit.index
          this.taskInEdit = thisTask
          this.taskInEdit.index = index
        }
        if (JSON.stringify(this.taskInEdit) !== '{}' && !thisTask) {
          this.$set(this.taskInEdit, 'isRemoved', true)
        }
      },
      deep: true
    }
  },
  computed: {
    active () {
      return this.$store.getters.tasks
    },
    proposes () {
      return []
    },
    isOrganization () {
      return this.$store.getters.activeOrganization
    },
    trackNumsClass () {
      return this.$vuetify.breakpoint.smAndDown ? 'trackingNums-small' : (this.$vuetify.breakpoint.mdOnly ? 'trackingNums-medium' : 'trackingNums-large')
    },
    historyHeaders () {
      let quantitySummary = (this.tab === 2 ? this.canceledTaskHistory : this.taskHistory).reduce((acc, cur) => {
        let qty = this.tab === 2 ? cur.cancelQuantity : cur.quantity
        if (typeof qty === 'string') {
          return (acc + parseInt(qty))
        } else {
          return (acc + qty)
        }
      }, 0)
      return [
        { text: '#', align: 'left', sortable: false, width: '5%', value: 'note' },
        { text: 'Offer id', align: 'left', sortable: false, value: 'offerKey' },
        { text: this.isOrganization ? 'Member' : 'Organization', value: this.isOrganization ? 'userName' : 'tenantName', align: 'left', sortable: true },
        { text: 'Item', value: 'productName', align: 'left', sortable: false },
        { text: 'Send-to', value: 'warehouse', align: 'left', sortable: false },
        { text: 'Price', value: 'price', align: 'left', sortable: false },
        { text: `Quantity(${quantitySummary})`, value: 'quantity', align: 'center', sortable: false },
        { text: this.tab === 2 ? 'Canceled Time' : 'Create time', value: 'createTime', align: 'left', sortable: false }
      ]
    },
    isFirstTask () {
      return this.filteredTasks.length === 0 || this.filteredTasks.findIndex(item => item.taskKey === this.taskInEdit.taskKey) === 0
    },
    isLastTask () {
      return this.filteredTasks.length === 0 || this.filteredTasks.findIndex(item => item.taskKey === this.taskInEdit.taskKey) === this.filteredTasks.length - 1
    },
    allOffers () {
      return [
        ...this.$store.getters.offers,
        ...this.$store.getters.expiredOffers
      ]
    },
    tenantActiveTasksWithSites () {
      return this.tenantActiveTasks.map(task => {
        const linkedOffer = (this.allOffers.find(({key}) => task.offerKey === key))
        const warehouseSites = (linkedOffer || {}).warehouseSites || []
        return {
          ...task,
          isLinkToActiveOffers: !!linkedOffer,
          warehouseSites
        }
      })
    }
  },
  methods: {
    getMaxColumn (quantity) {
      return quantity >= 4 ? 4 : quantity
    },
    showConfirmTaskDialog (task, index) {
      this.taskInEdit = task
      this.taskInEdit.index = index
      this.confirmTaskDialog = true
    },
    showReportDialog (item) {
      this.reportInEdit = item
      this.reportDialog = true
    },
    showBadge (index) {
      if (!this.isOrganization) {
        return false
      }
      switch (index) {
        case 2:
          return this.reportLost.length > 0
        default:
          return false
      }
    },
    dispatchAndToast (promise, actionText) {
      promise
        .catch(error => {
          this.$store.dispatch('showToast', {info: `${actionText} failed` + error.message})
        })
    },
    showCancelTaskDialog (task) {
      this.cancelTaskDialog = true
      this.taskToCancel = task
      this.cancelQuantity = task.quantity
    },
    cancelTask () {
      let payload = {task: this.taskToCancel, cancelQuantity: this.cancelQuantity}
      this.dispatchAndToast(
        this.$store.dispatch('cancelTask', payload)
          .then((curQty) => {
            if (this.isOrganization) {
              if (curQty === 0) {
                this.tenantActiveTasks = this.tenantActiveTasks.filter(taskItem => taskItem._key !== payload.task._key)
              } else {
                this.tenantActiveTasks.find(taskItem => taskItem._key === payload.task._key).quantity = curQty
              }
            }
          })
        , 'cancel task')
    },
    getPreviousTask () {
      let filteredItems = this.filteredTasks
      let curIndex = filteredItems.findIndex(item => item.taskKey === this.taskInEdit.taskKey)
      if (curIndex === -1) {
        let index = filteredItems[this.taskInEdit.index - 1] ? this.taskInEdit.index - 1 : filteredItems.length - 1
        this.taskInEdit = filteredItems[this.taskInEdit.index - 1] || filteredItems[filteredItems.length - 1] || {isRemoved: true}
        this.$set(this.taskInEdit, 'index', index)
      } else {
        this.taskInEdit = filteredItems[curIndex - 1] || {isRemoved: true}
        this.$set(this.taskInEdit, 'index', curIndex - 1)
      }
    },
    getNextTask () {
      let filteredItems = this.filteredTasks
      let curIndex = filteredItems.findIndex(item => item.taskKey === this.taskInEdit.taskKey)
      if (curIndex === -1) {
        let index = filteredItems[this.taskInEdit.index] ? this.taskInEdit.index : filteredItems.length - 1
        this.taskInEdit = filteredItems[this.taskInEdit.index] || filteredItems[filteredItems.length - 1] || {isRemoved: true}
        this.$set(this.taskInEdit, 'index', index)
      } else {
        this.taskInEdit = filteredItems[curIndex + 1] || {isRemoved: true}
        this.$set(this.taskInEdit, 'index', curIndex + 1)
      }
    },
    showSiteAddresses (warehouseSites) {
      this.addressItems = warehouseSites
      this.addressToggle = true
    }
  }
}
</script>

<style>
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

.card-text-expand {
  display: inline-block;
  width: 23vw;
}
</style>
