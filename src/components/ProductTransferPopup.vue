<template>
  <FormSubmitPopup
    :title="title"
    v-model="value"
    @popupClose="$emit('input', false)"
    @loaderButtonError="(error) => {submitError = error}"
    :rightMethod="onSubmitted"
    rightButtonText="Submit"
    large>
    <template v-slot:input>
      <v-container>
        <v-layout align-baseline>
          <v-flex md5 lg3>
            <v-menu 
              offset-y
              :close-on-content-click="false"
              v-model="menuOrg"
            >
              <template v-slot:activator="{ on }">
                <v-text-field
                  label="Recipient organization name"
                  hint="Enter an organization name to receive product(s)"
                  persistent-hint
                  v-model="toName"
                  :rules="[fieldIsRequired()]"
                  class="required_field"
                  @click.stop="on.click"
                >
                  <template v-slot:append>
                    <v-tooltip top>
                      <template v-slot:activator="{ on }">
                        <v-icon 
                          :color="isOrgAddFavorite ? 'yellow darken-2':'grey light-2'" 
                          v-on="on"  
                          @click="() => { isOrgAddFavorite = !isOrgAddFavorite }"
                        >favorite</v-icon>
                      </template>
                      <span>Add to favorites</span>
                    </v-tooltip>
                  </template>
                </v-text-field>
              </template>
              <v-list v-if="displayFavoriteOrgs && displayFavoriteOrgs.length">
                <v-list-tile 
                  v-for="item in displayFavoriteOrgs" 
                  :key="item" 
                  @click.stop="() => onSelectRecipient(item)"
                >
                  <v-list-tile-content>
                    <v-list-tile-title v-html="item"></v-list-tile-title>
                  </v-list-tile-content>
                  <v-list-tile-action>
                    <v-icon @click.stop="() => deleteRecipient(item)">delete</v-icon>
                  </v-list-tile-action>
                </v-list-tile>
              </v-list>
            </v-menu>
          </v-flex>
          <v-flex md1></v-flex>
          <v-flex md5 lg3>
            <v-menu 
              offset-y
              :close-on-content-click="false"
              v-model="menuReceiver"
            >
              <template v-slot:activator="{ on }">
                <v-text-field
                  label="Balance reciever (optional)"
                  hint="Enter a user name to receive the balance"
                  persistent-hint
                  v-model="userName"
                  @click.stop="on.click"
                >
                  <template v-slot:append>
                    <v-tooltip top>
                      <template v-slot:activator="{ on }">
                        <v-icon 
                          :color="isReceiverAddFavorite ? 'yellow darken-2':'grey light-2'" 
                          v-on="on"  
                          @click="() => { isReceiverAddFavorite = !isReceiverAddFavorite }"
                        >favorite</v-icon>
                      </template>
                      <span>Add to favorites</span>
                    </v-tooltip>
                  </template>
                </v-text-field>
              </template>
              <v-list v-if="displayFavoriteReceivers && displayFavoriteReceivers.length">
                <v-list-tile 
                  v-for="item in displayFavoriteReceivers" 
                  :key="item" 
                  @click.stop="() => onSelectReceiver(item)"
                >
                  <v-list-tile-content>
                    <v-list-tile-title v-html="item"></v-list-tile-title>
                  </v-list-tile-content>
                  <v-list-tile-action>
                    <v-icon @click.stop="() => deleteReceiver(item)">delete</v-icon>
                  </v-list-tile-action>
                </v-list-tile>
              </v-list>
            </v-menu>
          </v-flex>
        </v-layout>
        <ProductTableAndSelect
          ref="product_table_select"
          v-model="productsSelected"
          :submitError="submitError"
          :isBillingBalanceBelowCritical="isBillingBalanceBelowCritical"/>
        <v-textarea
          class="mt-3 thinBox"
          id="balance_note"
          label="Note"
          outline
          v-model="note"></v-textarea>
        <UploadFileWidget
          v-model="uploadedFiles"
          type="transfer"
          :maxFiles="1"
          :removeFilesUponUnmounted="!isConfirmed"
          :isDisableCancelBtn="isLoading"></UploadFileWidget>
      </v-container>
    </template>
  </FormSubmitPopup>
</template>

<script>
import FormSubmitPopup from './FormSubmitPopup'
import ProductTableAndSelect from './ProductTableAndSelect'
import {checkRules} from '../utils/tools'
import UploadFileWidget from './UploadFileWidget'
import LoaderButton from './LoaderButton'
 
export default {
  name: 'productTransferPopup',
  components: {
    FormSubmitPopup,
    ProductTableAndSelect,
    UploadFileWidget,
    LoaderButton
  },
  mixins: [checkRules],
  data () {
    return {
      toName: '',
      note: '',
      productsSelected: {},
      submitError: '',
      uploadedFiles: {},
      isConfirmed: false,
      userName: '',
      isOrgAddFavorite: false,
      isReceiverAddFavorite: false,
      favoriteRecipients: [...(this.$store.getters.favorites.recipients || [])],
      favoriteReceivers: [...(this.$store.getters.favorites.receivers || [])],
      menuOrg: false,
      menuReceiver: false,
      isLoading: false
    }
  },
  mounted () {
    this.submitError = ''
  },
  watch: {
    toName (val) {
      this.submitError = ''
      if (this.favoriteRecipients.includes(val)) {
        this.isOrgAddFavorite = true
      }
    },
    userName (val) {
      this.submitError = ''
      if (this.favoriteReceivers.includes(val)) {
        this.isReceiverAddFavorite = true
      }
    },
    productsSelected: {
      handler: function () {
        this.submitError = ''
      },
      deep: true
    }
  },
  computed: {
    isBillingBalanceBelowCritical () {
      let selectedWarehouseKeys = new Set(Object.values(this.productsSelected)
        .filter(item => item.warehouseKey)
        .map(item => item.warehouseKey))
      let warehouses = this.$store.getters.warehousesWithBalanceAndThreshold
        .filter(warehouse => warehouse.warehouseName !== 'Others' && selectedWarehouseKeys.has(warehouse.warehouseKey))
      return warehouses.some(warehouse => warehouse.balance && parseFloat(warehouse.balance) <= (warehouse.criticalLowBalanceThreshold || 0))
    },
    displayFavoriteOrgs () {
      return this.favoriteRecipients.filter(item => item.toLowerCase().includes(this.toName.toLowerCase()))
    },
    displayFavoriteReceivers () {
      return this.favoriteReceivers.filter(item => item.toLowerCase().includes(this.userName.toLowerCase()))
    }
  },
  methods: {
    async onSubmitted () {
      if (this.isBillingBalanceBelowCritical) {
        return Promise.reject(Error('Transfer failed due to low balance.'))
      }
      let validationRtn
      if (this.userName) {
        let {result, to, userKey} = await this.validateUser()
        if (!result) {
          return Promise.reject(Error('Create transfer failed. Balance receiver is not a member of the recipient organization.'))
        }
        validationRtn = {to, userKey, userName: this.userName}
      } else {
        validationRtn = {to: await this.validateTenant()}
      }
      let {toName, note, productsSelected, uploadedFiles} = this.$data
      this.isConfirmed = true
      let payload = {
        toName, 
        note, 
        productsSelected: Object.values(productsSelected), 
        files: uploadedFiles, 
        ...validationRtn
      }
      this.isLoading = true
      return this.actionFunc(payload)
        .then(() => {
          let updates = {}
          updates.recipients = this.isOrgAddFavorite ? 
            [...new Set([...this.favoriteRecipients, this.toName])] : 
            this.favoriteRecipients.filter(item => item !== this.toName)

          updates.receivers = this.isReceiverAddFavorite ?
            [...new Set([...this.favoriteReceivers, this.userName])] :
            this.favoriteReceivers.filter(item => item !== this.userName)
          return this.$store.dispatch('updateFavorites', updates)
        })
        .finally(() => {
          this.isLoading = false
        })
    },
    validateUser (payload) {
      this.userName = this.userName.trim()
      this.toName = this.toName.trim()
      let products = Object.values(this.productsSelected)
      return this.$store.dispatch('validateUser', {
        userName: this.userName, 
        tenantName: this.toName, 
        warehouseKey: products[0] && products[0].warehouseKey
      })
    },
    validateTenant (payload) {
      this.toName = this.toName.trim()
      let products = Object.values(this.productsSelected)
      return this.$store.dispatch('validateTenant', {
        tenantName: this.toName, 
        warehouseKey: products[0] && products[0].warehouseKey
      })
    },
    onSelectRecipient (item) {
      this.toName = item
      this.menuOrg = false
    },
    deleteRecipient (item) {
      this.favoriteRecipients = this.favoriteRecipients.filter(recipient => recipient !== item)
      if (this.toName === item) {
        this.isOrgAddFavorite = false
      }
    },
    onSelectReceiver (item) {
      this.userName = item
      this.menuReceiver = false
    },
    deleteReceiver (item) {
      this.favoriteReceivers = this.favoriteReceivers.filter(recipient => recipient !== item)
      if (this.userName === item) {
        this.isReceiverAddFavorite = false
      }
    }
  },
  props: {
    title: String,
    value: Boolean,
    actionText: {
      type: String,
      default: 'Save'
    },
    actionFunc: Function
  }
}
</script>
