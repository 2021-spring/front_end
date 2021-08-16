<template>
  <FormSubmitPopup
    :title="title"
    v-model="value"
    :rightMethod="onSubmitted"
    @popupClose="$emit('input', false)"
    :rightButtonText="actionText"
    large>
    <template v-slot:input>
      
      <v-layout wrap justify-start>
        <v-flex sm2 ml-1 mr-1>
          <v-menu
            :close-on-content-click="false"
            v-model="endDatePicker"
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
                label="End date"
                prepend-icon="event"
                readonly
                v-on="data.on"
                :rules="[
                  fieldIsRequired('Announcement end date'), 
                  value => (new Date(value) > endDateMinimum) || 'End date must large than today'
                ]"
              ></v-text-field>
            </template>
            <v-date-picker
              :min="endDateMinimum.toISOString()"
              v-model="newAnnouncement.endDate" 
              @input="endDatePicker = false"
              ></v-date-picker>
          </v-menu>
        </v-flex>
        <v-flex sm3 v-if="isAdmin" ml-1 mr-1>
          <v-combobox
            :items="msgTypes"
            v-model="selectedMsgType"
            item-text="displayName"
            item-value="value"
            label="Recievers"
            :return-object="false"
            chips
            multiple
            clearable />
        </v-flex>
        <v-flex sm2 v-else-if="isOrganization" ml-1 mr-1>
          <v-checkbox label="Send email" v-model="isSendOrganizationAnnouncementEmail"></v-checkbox>
        </v-flex>
      </v-layout>
        <v-layout pt-3 justify-center wrap>
          <v-textarea
            id="msgContent"
            label="Announcement"
            outline
            rows="20"
            :rules="[fieldIsRequired('Announcement content')]"
            v-model="newAnnouncement.msgContent"
            class="thinBox"></v-textarea>
        </v-layout>
    </template>
  </FormSubmitPopup>
</template>

<script>
import FormSubmitPopup from './FormSubmitPopup'
import SelectWidget from './SelectWidget'
import {timeTools, checkRules} from '../utils/tools'

export default {
  name: 'AnnouncementEdit',
  components: {
    FormSubmitPopup,
    SelectWidget
  },
  mixins: [timeTools, checkRules],
  data () {
    return {
      newAnnouncement: {},
      startDatePicker: false,
      endDatePicker: false,
      startDateFormatted: '',
      endDateFormatted: '',
      endDateMinimum: (new Date()),
      msgTypes: [
        {displayName: 'Warehouse', chip: 'W', value: 'warehouse'}, 
        {displayName: 'Tenant', chip: 'T', value: 'tenant'}, 
        {displayName: 'User', chip: 'U', value: 'user'}
      ],
      selectedMsgType: [],
      isSendOrganizationAnnouncementEmail: false,
      loading: false
    }
  },
  mounted () {
    let newAnnouncement = ((this.announcement || {})._key && this.announcement.getData()) || {}
    if (this.isAdmin) {
      this.selectedMsgType = ['warehouse', 'tenant', 'user']
    }
    if (this.announcement._key) {
      newAnnouncement.startDate = newAnnouncement && this.toPickerDateString(newAnnouncement.startDate)
      newAnnouncement.endDate = newAnnouncement && this.toPickerDateString(newAnnouncement.endDate)
      newAnnouncement.msgContent = (newAnnouncement && newAnnouncement.msgContent) || ''
      newAnnouncement._key = this.announcement._key
      this.selectedMsgType = newAnnouncement.msgType
    } else {
      newAnnouncement.startDate = this.toPickerDateString(this.endDateMinimum)
    }
    this.newAnnouncement = newAnnouncement
  },
  watch: {
    'newAnnouncement.startDate': function (value) {
      this.startDateFormatted = this.formatDate(value)
    },
    'newAnnouncement.endDate': function (value) {
      this.endDateFormatted = this.formatDate(value)
    },
    immediate: true
  },
  computed: {
    isAdmin () {
      return !!(this.$store.getters.user || {}).isAdmin
    },
    isOrganization () {
      return this.$store.getters.activeOrganization
    },
    members () {
      return this.$store.getters.users || []
    }
  },
  methods: {
    onSubmitted () {
      this.loading = true
      let payload = {
        ...this.newAnnouncement, 
        msgType: this.selectedMsgType,
        startDate: this.toDateStart(this.newAnnouncement.startDate),
        endDate: this.toDateEnd(this.newAnnouncement.endDate)
      }
      return this.actionFunc(payload)
        .then(() => {
          if (this.isOrganization && this.isSendOrganizationAnnouncementEmail && this.members.length > 0) {
            const receivers = this.members.map(({email}) => email)
            return this.$store.dispatch('sendAnnouncementEmails', {
              msgContent: payload.msgContent,
              startDate: this.newAnnouncement.startDate,
              endDate: this.newAnnouncement.endDate,
              receivers
            })
          }
        })
        .finally(() => { this.loading = false })
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
    announcement: {
      type: Object,
      default: () => {
        return {}
      }
    }
  }
}
</script>
