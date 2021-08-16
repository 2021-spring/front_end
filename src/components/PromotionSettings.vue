<template>
  <v-container fluid>
    <v-layout class="headline">Promotion schedule</v-layout>
    <v-layout>
      <v-flex>
        <v-btn dark color="primary" class="add" @click="showEditPromotionDialog({})">Add</v-btn>
        <v-data-table
          :headers="headers"
          :items="promotions"
          item-key="key"
          :pagination.sync="pagination"
          class="elevation-2 myDense"
          :expand="expand">
          <template v-slot:items="props">
            <tr @click="props.expanded = !props.expanded">
              <td class="subheading">{{ toDateString(props.item.startDate) }}</td>
              <td class="subheading">{{ toDateString(props.item.endDate) }}</td>
              <td class="subheading">{{ props.item.title}}</td>
              <td class="text-xs-center">
                <v-layout>
                  <v-flex><v-btn dark color="primary" flat @click.stop="showEditPromotionDialog(props.item)">Edit</v-btn></v-flex>
                  <v-flex><v-btn dark color="secondary" flat @click.stop="deletePromotion(props.item)">Delete</v-btn></v-flex>
                </v-layout>
              </td>
            </tr>
          </template>
           <template v-slot:expand="props">
              <v-card>
                <v-card-text>
                  <v-layout justify-center>
                    <v-flex sm6>
                      <v-layout>
                        <v-flex sm7>
                          <v-layout 
                            v-for="(item, index) in props.item.tierDeposits" 
                            :key="index" 
                            justify-start wrap>
                            <v-flex><b>&ge; ${{item.threshold}} Bonus: </b>${{item.bonus}} </v-flex>
                          </v-layout>
                        </v-flex>
                        <v-spacer></v-spacer>
                        <v-flex sm5>
                          <v-layout column>
                            <div><b>Note:</b></div>
                            <div style="whiteSpace: pre-wrap; overflow-wrap: break-word; max-width: 30vw;">{{props.item.note}}</div>
                          </v-layout>
                        </v-flex>
                      </v-layout>
                    </v-flex>
                  </v-layout>
                </v-card-text>
              </v-card>
            </template>
        </v-data-table>
      </v-flex>
    </v-layout>
    
    <PromotionEdit
      title="Promotions"
      v-model="editPromotionDialog"
      v-if="editPromotionDialog"
      :actionFunc="editPromotionFunc"
      :promotion="promotionInEdit"
    ></PromotionEdit>
  </v-container>
</template>

<script>

import PromotionEdit from './PromotionEdit'
import { timeTools } from '../utils/tools'

export default {
  name: 'PromotionSettings',
  components: {
    PromotionEdit
  },
  mixins: [timeTools],
  data () {
    return {
      headers: [
        { text: 'Start date', align: 'left', sortable: true, value: 'startDate' },
        { text: 'End date', align: 'left', sortable: true, value: 'endDate' },
        { text: 'Title', align: 'left', sortable: false, value: 'title' },
        { text: 'Action', value: 'note', align: 'center', sortable: false, width: '10%' }
      ],
      startDatePicker: false,
      endDatePicker: false,
      promotionInEdit: {},
      billingRatesDialog: false,
      editPromotionDialog: false,
      pagination: {
        sortBy: ''
      },
      expand: false
    }
  },
  watch: {

  },
  mounted () {
    this.$store.dispatch('loadSettingPromotions')
  },
  computed: {
    promotions () {
      return this.$store.getters.settingPromotions
    }
  },
  methods: {
    showEditPromotionDialog (item) {
      this.editPromotionDialog = true
      this.promotionInEdit = item
    },
    deletePromotion (item) {
      if (!confirm('Deleting Promotion tier will remove it from organization that assigned to it. Please use “Edit” instead for updating this tier. Do you still want to delete?')) return Promise.resolve()
      return this.$store.dispatch('deleteSettingPromotion', item)
    },
    fieldCheckDup (fieldName) {
      return (v) => !this.promotions.some(item => (item.key !== this.PromotionInEdit.key && item[fieldName] === v)) || `Duplicated ${fieldName}, please check.`
    },
    editPromotionFunc (promotion) {
      promotion.key ? this.editPromotion(promotion) : this.addPromotion(promotion)
    },
    addPromotion (promotion) {
      this.$store.dispatch('insertSettingPromotion', promotion)
    },
    editPromotion (promotion) {
      this.$store.dispatch('updateSettingPromotion', promotion)
    }
  }
}
</script>
