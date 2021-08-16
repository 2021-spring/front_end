<template>
  <FormSubmitPopup
    :title="title"
    v-model="value"
    :rightMethod="onSubmitted"
    @popupClose="$emit('input', false)"
    :rightButtonText="actionText"
    large>
    <template v-slot:input>
      <v-layout row wrap>
        <v-flex sm12>
          <v-text-field
            label="Promotion title"
            required
            :rules="[fieldIsRequired('Promotion title')]"
            prepend-icon="subtitles"
            v-model="newPromotion.title"
          ></v-text-field>
        </v-flex>
      </v-layout>
      <v-layout wrap align-center>
        <v-flex sm4>
          <v-menu
            ref="startDatePicker"
            lazy
            :close-on-content-click="false"
            v-model="startDatePicker"
            transition="scale-transition"
            offset-y
            full-width
            :nudge-right="40"
            min-width="290px"
            :return-value.sync="newPromotion.startDate"
          >
            <template v-slot:activator="{ on }">
              <v-text-field
                label="Start date"
                v-model="startDateFormatted"
                required
                :rules="[fieldIsRequired('Start date')]"
                prepend-icon="event"
                v-on="on"
                readonly
              ></v-text-field>
            </template>
            <v-date-picker v-model="newPromotion.startDate" scrollable>
              <v-spacer></v-spacer>
              <v-btn flat color="primary" @click="startDatePicker = false">Cancel</v-btn>
              <v-btn flat color="primary" @click="$refs.startDatePicker.save(newPromotion.startDate)">OK</v-btn>
            </v-date-picker>
          </v-menu>
        </v-flex>
        <v-flex sm1></v-flex>
        <v-flex sm4>
          <v-menu
            ref="endDatePicker"
            lazy
            :close-on-content-click="false"
            v-model="endDatePicker"
            transition="scale-transition"
            offset-y
            full-width
            :nudge-right="40"
            min-width="290px"
            :return-value.sync="newPromotion.endDate"
          >
            <template v-slot:activator="{ on }">
              <v-text-field
                label="End date"
                required
                :rules="[fieldIsRequired('End date')]"
                v-model="endDateFormatted"
                prepend-icon="event"
                v-on="on"
                readonly
              ></v-text-field>
            </template>
            <v-date-picker v-model="newPromotion.endDate" scrollable>
              <v-spacer></v-spacer>
              <v-btn flat color="primary" @click="endDatePicker = false">Cancel</v-btn>
              <v-btn flat color="primary" @click="$refs.endDatePicker.save(newPromotion.endDate)">OK</v-btn>
            </v-date-picker>
          </v-menu>
        </v-flex>
        <v-flex sm1></v-flex>
        <v-tooltip bottom>
          <template v-slot:activator="{ on }">
            <v-flex sm2
              v-on="on">
              <v-checkbox 
                label="Allow multiple" 
                v-model="newPromotion.isAllowMultiple"
              ></v-checkbox>
            </v-flex>
          </template>
          <span>Promotion will apply to the same user multiple times if qualifies</span>          
        </v-tooltip>
      </v-layout>
      <v-layout wrap align-center>
        <v-flex sm4>
          <v-text-field
            label="Threshold"
            :rules="[fieldIsNumber('Bonus'), fieldIsNoLessThanZero('Bonus')]"
            prepend-icon="attach_money"
            @keyup.enter="addBonusItem()"
            v-model.number="tierDepositInput.threshold"
          ></v-text-field>
        </v-flex>
        <v-flex sm1></v-flex>
        <v-flex sm4>
          <v-text-field
            label="Bonus"
            :rules="[fieldIsNumber('Bonus'), fieldIsNoLessThanZero('Bonus')]"
            prepend-icon="attach_money"
            @keyup.enter="addBonusItem()"
            v-model.number="tierDepositInput.bonus"
          ></v-text-field>
        </v-flex>
        <v-flex sm1></v-flex>
        <v-flex sm2>
          <v-btn 
            right 
            :disabled="!canAddNewThreshold"
            color="primary"
            @click="addBonusItem()">Add</v-btn>
        </v-flex>
        <v-layout >
          
          <v-flex sm12>
            <v-data-table
              :headers="headers"
              :items="newPromotion.tierDeposits"
              item-key="reportKey"
              :pagination.sync="pagination"
              class="elevation-2 myDense"
            >
              <template v-slot:items="{item}">
                  <td class="subheading">{{ item.threshold }}</td>
                  <td class="text-xs-left">{{ item.bonus }}</td>
                  <td class="text-xs-center">
                    <v-layout>
                      <v-flex><v-btn dark color="secondary" flat @click.stop="deleteBonus(item)">Delete</v-btn></v-flex>
                    </v-layout>
                  </td>
              </template>
              <template slot="no-data">
                <v-layout align-center justify-center>      
                  <v-flex sm4>
                    <v-text-field
                      disabled
                      center
                      :rules="[v=>'Need at least one pair of threshold & bonus']"
                    ></v-text-field>
                  </v-flex>
                </v-layout>
              </template>
            </v-data-table>
          </v-flex>
        </v-layout>
      </v-layout > 
        <v-layout pt-3 justify-center wrap>
          <v-textarea
            id="promotion_note"
            label="Note"
            outline
            v-model="newPromotion.note"
            class="thinBox"></v-textarea>
        </v-layout>
    </template>
  </FormSubmitPopup>
</template>

<script>
import FormSubmitPopup from './FormSubmitPopup'
import {timeTools, checkRules} from '../utils/tools'

export default {
  name: 'PromotionEdit',
  components: {
    FormSubmitPopup
  },
  mixins: [timeTools, checkRules],
  data () {
    return {
      headers: [
        { text: 'Threshold($)', align: 'left', sortable: true, value: 'threshold' },
        { text: 'Bonus($)', value: '', align: 'left', sortable: false },
        { text: 'Action', value: 'note', align: 'center', sortable: false, width: '10%' }
      ],
      newPromotion: {
      },
      startDatePicker: false,
      endDatePicker: false,
      startDateFormatted: '',
      endDateFormatted: '',
      tierDepositInput: {
        threshold: 0,
        bonus: 0
      },
      pagination: {
        sortBy: 'threshold',
        descending: true
      }
    }
  },
  created () {
    let newPromotion = {...this.promotion}
    if (newPromotion.key) {
      newPromotion.startDate = newPromotion && this.toPickerDateString(newPromotion.startDate)
      newPromotion.endDate = newPromotion && this.toPickerDateString(newPromotion.endDate)
      newPromotion.tierDeposits = [...this.promotion.tierDeposits]
    } else {
      newPromotion.isAllowMultiple = false
      newPromotion.startDate = this.toPickerDateString(new Date())
      newPromotion.endDate = newPromotion.startDate
      newPromotion.tierDeposits = []
      newPromotion.note = ''
      newPromotion.title = ''
    }

    this.newPromotion = newPromotion
  },
  watch: {
    'newPromotion.startDate': function (value) {
      this.startDateFormatted = this.formatDate(value)
    },
    'newPromotion.endDate': function (value) {
      this.endDateFormatted = this.formatDate(value)
    },
    immediate: true
  },
  computed: {
    canAddNewThreshold () {
      return this.tierDepositInput.threshold > 0 && this.tierDepositInput.bonus > 0
    }
  },
  methods: {
    onSubmitted () {
      return this.actionFunc({
        ...this.newPromotion, 
        startDate: this.toDateStart(this.newPromotion.startDate),
        endDate: this.toDateEnd(this.newPromotion.endDate)
      }) 
    },
    deleteBonus (item) {
      this.newPromotion.tierDeposits = this.newPromotion.tierDeposits.filter(tierDeposit => tierDeposit.threshold !== item.threshold)
    },
    addBonusItem () {
      if (this.tierDepositInput.threshold <= 0) return alert('Cannot set the threshlod less than 0')
      if (this.newPromotion.tierDeposits.some(tierDeposit => tierDeposit.threshold === this.tierDepositInput.threshold)) {
        alert('This threshold has already been set')
      } else {
        this.newPromotion.tierDeposits.push(this.tierDepositInput)
      }
      this.tierDepositInput = { threshold: 0, bonus: 0 }
    }
  },
  props: {
    title: String,
    value: Boolean,
    actionText: {
      type: String,
      default: 'Save'
    },
    actionFunc: Function,
    promotion: {
      type: Object,
      default: () => {
        return {}
      }
    }
  }
}
</script>
