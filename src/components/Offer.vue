<template>
  <v-container fluid>
    <v-tabs
        color="transparent"
        v-model="tab"
        show-arrows
      >
        <v-tabs-slider color="primary"></v-tabs-slider>
        <v-tab v-for="(tabItem, index) in tabs" :key="tabItem">
          <v-badge class="notification" :value="showBadge(index)" color="red">
            <template v-slot:badge>
              <div dark></div>
            </template>
            <span class="tabItem">
              {{ tabItem }}
            </span>
          </v-badge>
        </v-tab>
      <v-spacer></v-spacer>
      <div v-if="isUserReadGlobal" class="flash_alert flash_till_blind">
        <v-container fluid><v-layout align-center justify-center row fill-height><v-icon color="red">info</v-icon><span>New comment</span></v-layout></v-container>
      </div>
      <v-spacer></v-spacer>
      <v-spacer></v-spacer>
      <v-spacer></v-spacer>
      <v-tabs-items v-model="tab" touchless>
        <v-tab-item v-for="(item, index) in 4" :key="'item' + index">
          <OfferTable 
            v-if="index === 0 || index === 1 || (!isOrganization && index === 2)"
            :isRealtime="index === 0 || index === 1 || (!isOrganization && index === 2)"
            :offers="getData"
            :firstActionText="firstActionText"
            :midActionText="midActionText"
            :secondActionText="secondActionText"
            :midFunc="midFunc"
            :firstFunc="firstFunc"
            :secondFunc="secondFunc"
            :isPropose="isPropose"
            :isShowAddOffer="index === 0 && !!isOrganization"
            :participationFilter="index === 0"
            :addOfferFunc="showAddOfferDialog"></OfferTable>
          <PaginationController
            v-if="index === 2 && tab === 2 && isOrganization"
            v-model="archives"
            getDataActionName="getArchiveOffersPagination"
            :haveSearchBox="true"
            searchBoxLabel="keyword"
            searchBoxHint="support up to two consective keywords in product name"
            :historyLimit="historyLimit">
            <template v-slot:dataTable>
              <v-data-table
                :headers="archivedHeaders"
                :items="archives"
                class="elevation-2 myDense"
                hide-actions>
                <template v-slot:items="props">
                  <td class="subheading">{{ isNaN(props.item.key) ? props.index + 1 : props.item.key}}</td>
                  <td class="text-xs-left">
                    <v-flex :class="noteClass">
                      <OfferWidget
                        :name="getProduct(props.item.productId).name || props.item.productName"
                        :condition="getProduct(props.item.productId).condition || props.item.productCondition"
                        :isPublic="props.item.isPublic"
                        :price="props.item.price"
                        :note="props.item.note"
                        :isPropose="props.item.isPropose"
                        :isExpired="!isPropose && props.item.isExpired"
                        :isHistory="true"
                        :expirationDate="props.item.expirationDate"
                        :pendingPeriod="props.item.pendingPeriod"
                        :createTime="props.item.createTime"></OfferWidget>
                    </v-flex>
                  </td>
                  <td class="text-xs-left">{{ '$' + props.item.price }} <span v-if="props.item.bonus">(+{{props.item.bonus}})</span></td>
                  <td class="text-xs-left">{{ props.item.quantity }}</td>
                  <td class="text-xs-left">{{ !isPropose && props.item.taken ? props.item.quantity - props.item.taken :  props.item.quantity}}</td>
                  <td class="text-xs-right">
                    <v-layout>
                      <v-flex>
                        <LoaderButton
                          buttonText="Restore"
                          :promiseAwait="restoreOffer"
                          :promiseItem="props.item"
                          flat/>
                      </v-flex>
                      <v-flex><v-btn dark color="primary" flat @click.stop="showCopyOfferDialog(props.item)">Copy</v-btn></v-flex>
                    </v-layout>
                  </td>
                </template>
              </v-data-table>
            </template>
          </PaginationController>
          <v-layout v-if="index === 3 && tab === 3" justify-start>
            <v-flex class="success--text caption">
              <span class="realtime-border px-1">REAL TIME</span>
            </v-flex>
          </v-layout>
          <v-data-table
            v-if="index === 3 && tab === 3"
            :headers="headerReport"
            :items="reportLost"
            item-key="reportKey"
            class="elevation-2 myDense"
            :rows-per-page-items="rowPerPage">
            <template v-slot:items="props">
                <td class="subheading">{{ props.index + 1}}</td>
                <td>
                  <ProductWidget
                    :name="props.item.productName"
                    :condition="props.item.condition"
                    :price="props.item.price"
                    :asin="props.item.asin"
                    :upc="props.item.upc"></ProductWidget>
                </td>
                <td class="text-xs-left" v-if="isOrganization">{{ props.item.userName }}</td>
                <td class="text-xs-left" v-else>{{ (tenantWorkFor.find(item => item.tenantKey === props.item.tenantKey) || {}).tenantName }}</td>
                <td class="text-xs-left">{{ props.item.quantity }}</td>
                <td class="text-xs-left">{{ props.item.warehouseSite }}</td>
                <td class="text-xs-center">
                  <v-layout>
                    <v-flex v-if="isOrganization"><v-btn dark color="primary" flat @click.stop="showReportDialog(props.item)">Accept</v-btn></v-flex>
                    <v-flex><v-btn dark color="secondary" flat @click.stop="cancelReport(props.item)">Cancel</v-btn></v-flex>
                  </v-layout>
                </td>
            </template>
          </v-data-table>
        </v-tab-item>
      </v-tabs-items>
    </v-tabs>
    <FormSubmitPopup
      title="Accept report"
      v-model="reportDialog"
      v-if="reportDialog"
      @popupClose="reportDialog = false"
      :rightMethod="acceptReport"
      rightButtonText="Accept">
      <template v-slot:input>
        <v-container>
          <v-layout>
            <v-flex>
              <v-text-field
                label="Price(per item)"
                v-model.number="reportInEdit.price"
                :rules="[fieldIsRequired('price'), fieldIsNoLessThanZero('price')]"
                class="required_field"
              ></v-text-field>
              <v-text-field
                label="Quantity"
                readonly
                :rules="[fieldIsRequired('quantity'), fieldIsNoLessThanZero('quantity'), fieldIsInteger('quantity')]"
                v-model.number="reportInEdit.quantity"
                class="required_field"
              ></v-text-field>
            </v-flex>
          </v-layout>
        </v-container>
      </template>
    </FormSubmitPopup>
    <OfferEdit
      title="Edit offer"
      v-model="editOfferDialog"
      v-if="editOfferDialog"
      :actionFunc="editOfferFunc"
      :offer="offerInEdit"
      :editMode="true"></OfferEdit>
    <OfferEdit
      :title="addOfferText"
      v-model="addOfferDialog"
      v-if="addOfferDialog"
      actionText="Add"
      :actionFunc="editOfferFunc"
      :offer="offerInEdit"></OfferEdit>
    <OfferTakeTask
      :title="'Take Offer'"
      v-model="takeOfferDialog"
      v-if="takeOfferDialog"
      actionText="Submit"
      :actionFunc="offerTakeFunc"
      :offerTaken="offerInEdit"></OfferTakeTask>
    <OfferTakeTask
      :title="'Propose Offer'"
      v-model="propseOfferDialog"
      v-if="propseOfferDialog"
      :isPropose="true"
      actionText="Submit"
      :actionFunc="offerTakeFunc"
      :offerTaken="offerInEdit"></OfferTakeTask>
    <ChatRoom
      title="Comments"
      v-model="commentsDialog"
      v-if="commentsDialog"
      :lastReadTime="commentLastRead"
      :docPath="['offers', 'offers', 'proposes', docKey]"
      :comments="comments"
      sendWithEmail
      :emailContext="emailContext"
      :chatReciever='chatReciever'
      :isTenant="false"/>
  </v-container>
</template>

<script>
import OfferEdit from './OfferEdit'
import OfferTable from './OfferTable'
import OfferTakeTask from './OfferTakeTask'
import OfferWidget from './OfferWidget'
import ChatRoom from './ChatRoom'
import PaginationController from './PaginationController'
import ProductWidget from './ProductWidget'
import FormSubmitPopup from './FormSubmitPopup'
import LoaderButton from './LoaderButton'
import { checkRules } from '../utils/tools'

export default {
  name: 'Offer',
  components: {
    OfferTable,
    OfferEdit,
    OfferTakeTask,
    OfferWidget,
    ChatRoom,
    PaginationController,
    ProductWidget,
    FormSubmitPopup,
    LoaderButton
  },
  mixins: [checkRules],
  data () {
    return {
      tab: null,
      tabs: [
        'Active', 'Proposed', `${this.$store.getters.activeOrganization ? 'Archived' : 'Expired'}`, 'Report'
      ],
      addOfferDialog: false,
      editOfferDialog: false,
      takeOfferDialog: false,
      propseOfferDialog: false,
      commentsDialog: false,
      offerInEdit: {},
      proposeInEdit: {},
      firstActionText: '',
      midActionText: '',
      secondActionText: '',
      firstFunc: null,
      midFunc: null,
      secondFunc: null,
      isPropose: false,
      offerTakeFunc: null,
      archivedHeaders: [
        { text: 'ID#', align: 'left', sortable: false, value: 'key', width: '5%' },
        { text: 'Offer', value: 'productName', align: 'left', sortable: false },
        { text: 'Price', value: 'price', align: 'left', sortable: false },
        { text: 'Total quantity', value: 'quantity', align: 'left', sortable: false },
        { text: 'Available quantity', value: 'quantity', align: 'left', sortable: false },
        { text: 'Action', value: 'note', align: 'center', sortable: false, width: '8%' }
      ],
      headerReport: [
        { text: 'Product id', value: 'productId', align: 'left', sortable: false, width: '5%' },
        { text: 'Product name', value: 'productName', align: 'left', sortable: false },
        { text: 'User name', value: 'userName', align: 'left', sortable: false },
        { text: 'Quantity', value: 'quantity', align: 'left', sortable: false },
        { text: 'Warehouse site', value: 'warehouseSite', align: 'left', sortable: false },
        { text: 'Actions', value: 'lastModifiedTime', align: 'center', width: '15%' }
      ],
      historyLimit: 25,
      archives: [],
      reportDialog: false,
      reportInEdit: {},
      rowPerPage: [15, 30, 50, {text: 'All', value: -1}],
      editOfferFunc: null,
      addOfferText: null
    }
  },
  mounted () {
    let id = this.$route.query.id
    if (this.$store.getters.isRegularUser && id) {
      setTimeout(() => {
        let offer = this.getData.find(item => item.key === id)
        if (offer) this.showTakeOfferDialog(offer)
      }, 500)
    }
  },
  watch: {
    tab (value) {
      // todo: clear items and load data
      // this.$store.dispatch('clearAllOfferData')
      switch (value) {
        case 0:
          if (this.$store.getters.activeOrganization) {
            this.firstActionText = 'Archive'
            this.secondActionText = 'Edit'
            this.firstFunc = this.archiveOffer
            this.secondFunc = this.showEditOfferDialog
          } else {
            this.firstActionText = ''
            this.secondActionText = this.takeOrProposeText
            this.firstFunc = null
            this.secondFunc = this.takeOrProposeFunc
          }
          this.midActionText = ''
          this.midFunc = null
          this.isPropose = false
          // this.$store.dispatch('getAllOffers')
          break
        case 1:
          if (this.$store.getters.activeOrganization) {
            this.firstActionText = 'Accept'
            this.secondActionText = 'Reject'
            this.firstFunc = this.acceptPropose
            this.secondFunc = this.rejectPropose
          } else {
            this.firstActionText = 'Edit'
            this.secondActionText = 'Cancel'
            this.firstFunc = this.showEditProposeOfferDialog
            this.secondFunc = this.cancelPropose
          }
          this.midActionText = 'Comments'
          this.midFunc = this.showProposeCommentDialog
          this.isPropose = true
          break
        case 2:
          if (!this.$store.getters.activeOrganization) {
            this.firstActionText = ''
            this.secondActionText = 'Propose'
            this.firstFunc = null
            this.secondFunc = this.showProposeOfferDialog
          }
          this.midActionText = ''
          this.midFunc = null
          this.isPropose = false
          break
        default:
          break
      }
    },
    proposes: {
      handler: function (value) {
        this.proposeInEdit = value.find(propose => propose.key === this.proposeInEdit.key) || {}
      },
      deep: true
    }
  },
  computed: {
    offers () {
      let offers = this.$store.getters.offers
      if (!this.isOrganization) {
        const tasks = this.$store.getters.tasks
        return offers
          .map(offer => {
            return {...offer, isParticipated: (tasks.some(task => task.offerKey === offer.key))}
          })
          .filter(offer => !offer.isExpired)
      }
      return offers
    },
    proposes () {
      return this.$store.getters.proposes
    },
    expiredOffers () {
      return this.$store.getters.expiredOffers
    },
    products () {
      return this.$store.getters.products
    },
    comments () {
      return this.proposeInEdit ? this.proposeInEdit.comments : []
    },
    commentLastRead () {
      return (this.proposeInEdit && this.proposeInEdit[`lastRead_${this.$store.getters.uid}`] && this.proposeInEdit[`lastRead_${this.$store.getters.uid}`]) || new Date('2018-1-1')
    },
    docKey () {
      return this.proposeInEdit ? this.proposeInEdit.key : ''
    },
    chatReciever () {
      return this.proposeInEdit ? 
        (
          this.isOrganization ? 
            {type: 'userPropose', key: this.proposeInEdit.uid} : 
            {type: 'tenantPropose', key: this.proposeInEdit.tenantKey}
        ) : {type: '', key: ''}
    },
    emailContext () {
      return {
        createTime: this.proposeInEdit.createTime,
        productName: this.proposeInEdit.productName,
        price: this.proposeInEdit.price,
        quantity: this.proposeInEdit.quantity
      }
    },
    isOrganization () {
      return this.$store.getters.activeOrganization
    },
    warehouses () {
      return this.$store.getters.warehouses
    },
    noteClass () {
      return this.$vuetify.breakpoint.mdAndDown ? 'offerLink-medium' : (this.$vuetify.breakpoint.lgOnly ? 'offerLink-large' : 'offerLink-xlarge')
    },
    checkPrice () {
      if (typeof (this.reportInEdit.price) !== 'number') {
        return 'Illegal price type.'
      } 
      return this.reportInEdit.price >= 0 ? true : 'Price cannot be a negative number'
    },
    isValid () {
      return this.checkPrice === true
    },
    reportLost () {
      return this.$store.getters.reportLost
    },
    isUserReadGlobal () {
      let hasNewMessage = this.proposes.some((propose) => {
        return this.checkNewComment(propose)
      })
      return hasNewMessage
    },
    getData () {
      const data = [
        this.offers,
        this.proposes,
        this.isOrganization ? this.archives : this.expiredOffers
      ]
      return data[this.tab] || []
    },
    maxOfferQty () {
      if (this.$store.getters.tenant.maxOfferQty === 0) return 0
      return this.$store.getters.tenant.maxOfferQty || 500
    },
    tenantWorkFor () {
      return [{tenantName: '-- All --', tenantKey: ''}, ...this.$store.getters.tenantWorkFor]
    }
  },
  methods: {
    checkNewComment (item) {
      let lastReadTime = item[`lastRead_${this.$store.getters.uid}`]
      return item.comments && item.comments.length && (!lastReadTime || lastReadTime < item.comments.slice(-1)[0].createTime)
    },
    showReportDialog (item) {
      this.reportInEdit = {...item}
      this.reportDialog = true
    },
    getProduct (id) {
      return this.products.find(item => item.id === id) || {}
    },
    showBadge (index) {
      switch (index) {
        case 1:
          return this.proposes.length > 0
        case 3:
          return this.reportLost.length > 0
        default:
          return false
      }
    },
    showAddOfferDialog () {
      if (this.warehouses.length === 0) {
        return alert('Please set up your warehouses first.')
      }
      this.offerInEdit = {}
      this.addOfferText = 'Add offer'
      this.editOfferFunc = this.addOffer
      this.addOfferDialog = true
    },
    showCopyOfferDialog (offer) {
      let {taken, ...offerInEdit} = offer
      this.offerInEdit = offerInEdit
      this.addOfferText = 'Copy offer'
      this.editOfferFunc = this.addOffer
      this.addOfferDialog = true
    },
    showEditOfferDialog (offer) {
      this.offerInEdit = offer
      this.editOfferFunc = this.editOffer
      this.editOfferDialog = true
    },
    showTakeOfferDialog (offer) {
      this.offerInEdit = offer
      this.offerTakeFunc = this.takeOffer
      this.takeOfferDialog = true
    },
    showProposeOfferDialog (offer) {
      this.offerInEdit = offer
      this.offerTakeFunc = this.proposeOffer
      this.propseOfferDialog = true
    },
    showEditProposeOfferDialog (offer) {
      this.offerInEdit = offer
      this.offerTakeFunc = this.updatePropose
      this.propseOfferDialog = true
    },
    takeOrProposeText (offer) {
      let rtn = 'Take'
      if (offer.quantity === 0 || (offer.taken && offer.quantity === offer.taken)) {
        rtn = 'Propose'
      } 
      return rtn
    },
    takeOrProposeFunc (offer) {
      let rtn = this.showTakeOfferDialog
      if (offer.quantity === 0 || (offer.taken && offer.quantity === offer.taken)) {
        rtn = this.showProposeOfferDialog
      } 
      rtn(offer)
    },
    acceptReport () {
      this.$store.dispatch('acceptReport', this.reportInEdit)
    },
    cancelReport (item) {
      if (confirm('Do you want to cancel this report?')) {
        this.$store.dispatch('cancelReportTenant', item)
      }
    },
    dispatchAndToast (promise, actionText) {
      return promise
        .catch(error => {
          console.error(error.message)
          this.$store.dispatch('showToast', {info: `${actionText} failed`})
        })
    },
    addOffer (offer) {
      if (this.warehouses.length === 0) {
        return alert('Please set up your warehouses first.')
      }
      if (this.offers.length >= this.maxOfferQty) {
        throw Error(`Reach ${this.maxOfferQty} active offer limit. Please archive old offers. If you need to create more than ${this.maxOfferQty} offers, please contact you account manager.`)
      }
      return this.dispatchAndToast(this.$store.dispatch('addOffer', offer), 'add offer')
    },
    editOffer (offer, moveToTop = true) {
      let payload = {offer, oldOffer: this.offerInEdit, moveToTop}
      this.dispatchAndToast(this.$store.dispatch('editOffer', payload), 'update offer')
    },
    archiveOffer (offer) {
      this.dispatchAndToast(this.$store.dispatch('archiveOffer', offer), 'archive offer')
    },
    takeOffer (payload) {
      if (payload.offer.isExpired) {
        alert('Cannot take expired offer!')
        return
      }
      payload.task.warehouseKeys = payload.offer.warehouseKeys
      payload.task.trackingNums = ''
      payload.task.note = payload.offer.note
      payload.task.pendingPeriod = payload.offer.pendingPeriod
      return this.$store.dispatch('takeOffer', payload.task)
    },
    proposeOffer (payload) {
      payload.task.warehouseKeys = payload.offer.warehouseKeys
      payload.task.warehouseSites = payload.offer.warehouseSites
      payload.task.pendingPeriod = payload.offer.pendingPeriod
      return this.dispatchAndToast(this.$store.dispatch('proposeOffer', payload.task), 'propse offer')
    },
    async acceptPropose (payload) {
      return this.dispatchAndToast(this.$store.dispatch('acceptPropose', payload), 'accept propose')
    },
    rejectPropose (payload) {
      if (confirm('Are you sure to reject the propose?')) {
        this.dispatchAndToast(this.$store.dispatch('cancelPropose', payload), 'reject propose')
          .then(() => {
            let rejectPayload = {
              senderName: payload.tenantName,
              reciever: {
                type: 'userProposeReject',
                key: payload.uid
              },
              content: [],
              emailContext: {
                createTime: payload.createTime,
                productName: payload.productName,
                price: payload.price,
                quantity: payload.quantity
              }
            }
            this.$store.dispatch('sendNewCommentsByEmail', rejectPayload)
          })
      }
    },
    showProposeCommentDialog (item) {
      this.proposeInEdit = item
      this.commentsDialog = true
    },
    updatePropose (payload) {
      this.dispatchAndToast(this.$store.dispatch('updatePropose', payload.task), 'edit propose')
    },
    cancelPropose (payload) {
      if (confirm('Are you sure to cancel the task?')) {
        this.dispatchAndToast(this.$store.dispatch('cancelPropose', payload), 'cancel propose')
      }
    },
    restoreOffer (offer) {
      if (this.offers.length >= this.maxOfferQty) {
        alert(`Reach ${this.maxOfferQty} active offer limit. Please archive old offers. If you need to create more than ${this.maxOfferQty} offers, please contact you account manager.`)
        return Promise.resolve()
      }
      if (!confirm('Are you sure to restore this offer?')) return Promise.resolve()
      return this.$store.dispatch('restoreOffer', offer)
        .then(() => {
          this.archives = this.archives.filter(item => item._key !== offer._key)
        })
    }
  }
}
</script>

<style>

.tabItem {
  font-size: 14px;
}

.notification .v-badge__badge{
  width: 5px;
  height: 5px;
  top: -3px;
  right: -5px;
}

.flash_till_blind {
  animation: blink 1s infinite;
  -webkit-animation: blink 1s infinite;
}

.flash_alert {
  background-color: inherit !important;
  color: red;
  border: 0px;
}
</style>
