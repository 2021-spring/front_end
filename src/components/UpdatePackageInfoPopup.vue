<template>
  <FormSubmitPopup
    title="Update Packages Information"
    v-model="value"
    :rightMethod="onSubmitted"
    @popupClose="$emit('input', false)"
    :rightButtonText="actionText"
    large>
    <template v-slot:input>
      <v-data-table
        :headers="headers"
        :items="packagePairs"
        class="elevation-2 myDense"
        style="margin-bottom: 10px;"
        hide-actions>
        <template v-slot:items="{item, index}">
          <td class="subheading">{{ index + 1}}</td>
          <td class="text-xs-left">{{ item.tracking }}</td>
          <td class="text-xs-left">                   
            <v-layout :class="item.oldPackage.upc !== item.newPackage.upc ? 'font-green' : ''">{{upcMap[item.oldPackage.upc] ? upcMap[item.oldPackage.upc].description : 'New product'}}</v-layout>
            <v-layout :class="item.oldPackage.upc !== item.newPackage.upc ? 'font-green' : ''">UPC: {{item.oldPackage.upc}}</v-layout>
            <v-layout :class="item.oldPackage.quantity !== item.newPackage.quantity ? 'font-green' : ''">Quantity: {{item.oldPackage.quantity}}</v-layout>
            <v-layout :class="item.oldPackage.organizationKey !== item.newPackage.organizationKey ? 'font-green' : ''">Organization ID: {{organizationMap.get(item.oldPackage.organizationKey)}}</v-layout>
          </td>
          <td class="text-xs-left">                   
            <v-layout>{{upcMap[item.newPackage.upc] ? upcMap[item.newPackage.upc].description : 'New product'}}</v-layout>
            <v-layout>UPC: {{item.newPackage.upc}}</v-layout>
            <v-layout>Quantity: {{item.newPackage.quantity}}</v-layout>
            <v-layout>Organization ID: {{organizationMap.get(item.newPackage.organizationKey)}}</v-layout>
          </td>
          <td class="text-xs-left">{{ item.oldPackage.siteName }}</td>
        </template>
      </v-data-table>
      <v-divider></v-divider>
      <div style="margin-top: 10px;">
        <v-layout justify-space-between v-for="item in recommendations" :key="item.organizationId">
          <v-flex md2>
            <v-text-field
              label="Organization ID"
              readonly
              outline
              class="thinBox"
              v-model="item.organizationId"
            ></v-text-field>
          </v-flex>
          <v-flex md2>
            <v-text-field
              label="Storage fee"
              readonly
              outline
              class="thinBox"
              v-model="item.storageFee"
            ></v-text-field>
          </v-flex>
          <v-flex md2>
            <v-text-field
              label="Inbound fee"
              readonly
              outline
              class="thinBox"
              v-model="item.inboundFee"
            ></v-text-field>
          </v-flex>
          <v-flex md2>
            <v-text-field
              label="Discount rate"
              readonly
              outline
              class="thinBox"
              v-model="item.discountRate"
            ></v-text-field>
          </v-flex>
          <v-flex md2>
            <v-text-field
              label="Total fee"
              readonly
              outline
              class="thinBox"
              v-model="item.total"
            ></v-text-field>
          </v-flex>
        </v-layout>
      </div>
      <v-divider></v-divider>
      <div>
        <v-layout justify-start v-for="item in recommendations" :key="item.organizationId">
          <v-flex md4>
            <v-text-field
              label="Organization ID"
              readonly
              v-model.number="item.organizationId"></v-text-field>
          </v-flex>
          <v-flex md1></v-flex>
          <v-flex md4>
            <v-text-field
              label="Amount"
              prefix="$"
              class="required_field"
              v-model.number="adjustments[item.organizationKey]"
              clearable
              :rules="[(v) => typeof v === 'number' || v === null || 'Amount must be a number.']"></v-text-field>
          </v-flex>
        </v-layout>
        <v-textarea
          label="Note"
          outline
          v-model="note"></v-textarea>
      </div>
    </template>
  </FormSubmitPopup>
</template>

<script>
import FormSubmitPopup from './FormSubmitPopup'
import {timeTools, checkRules} from '../utils/tools'

export default {
  name: 'UpdatePackageInfoPopup',
  components: {
    FormSubmitPopup
  },
  mixins: [timeTools, checkRules],
  data () {
    return {
      headers: [
        { text: '#', align: 'left', sortable: false, width: '5%' },
        { text: 'Tracking', value: 'siteName', align: 'left', sortable: false },
        { text: 'Before', value: 'price', align: 'left', sortable: false, width: '30%' },
        { text: 'After', value: 'quantity', align: 'left', sortable: false, width: '30%' },
        { text: 'Site name', value: 'createTime', align: 'left', sortable: false }
      ],
      note: `Adjust package: ${this.packagePairs[0] && this.packagePairs[0].tracking}`,
      adjustments: {},
      recommendations: []
    }
  },
  async mounted () {
    await this.getRecommendations()
    this.recommendations.forEach(item => {
      this.$set(this.adjustments, item.organizationKey, item.total)
    })
  },
  computed: {
    upcMap () {
      return this.$store.getters.upcMap
    },
    organizationMap () {
      return this.$store.getters.organizationKeyToId
    },
    discountMap () {
      return new Map(this.$store.getters.tenantsWithBillings.map(item => {
        let {key, waives, discountRate} = item
        return [key, {waives, discountRate}]
      }))
    }
  },
  methods: {
    async getRecommendations () {
      this.recommendations = await this.$store
        .dispatch('updatePackageAdjustBalanceRecommendations', this.changes)
    },
    onSubmitted () {
      let promises = this.recommendations.map(item => {
        let {organizationKey} = item
        return this.$store.dispatch('adjustWarehouseBalance', {note: this.note, amount: this.adjustments[organizationKey], type: 'adjust', tenantKey: organizationKey, changes: this.changes})
      })
      return this.actionFunc()
        .catch((error) => {
          console.log(error.message)
          throw Error('update-pkg-failed.')
        })
        .then(() => {
          return Promise.all(promises)
            .catch(error => {
              console.log(error.message)
              return Error('update-pkg-succeeded-adjust-balance-failed.')
            })
        })
        .catch((error) => {
          if (error.message === 'update-pkg-failed.') throw Error('Update package information failed, please try again.')
          else if (error.message === 'update-pkg-succeeded-adjust-balance-failed.') throw Error('Update package information succeeded, but failed to adjust balance, please adjust balance manually.')
          else throw Error('Unknown error.')
        })
    }
  },
  props: {
    title: String,
    value: Boolean,
    actionText: {
      type: String,
      default: 'Confirm'
    },
    actionFunc: Function,
    packagePairs: {
      type: Array,
      default: () => {
        return []
      }
    },
    changes: {
      type: Object,
      default: () => {
        return {}
      }
    }
  }
}
</script>

<style>
.font-green {
    color: green;
}
</style>
