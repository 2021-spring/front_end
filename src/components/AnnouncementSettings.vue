<template>
   <v-container fluid>
    <v-layout class="headline"></v-layout>
    <v-layout>
      <v-flex>
        <v-btn :dark="addEnable" color="primary" :disabled="!addEnable" @click="showEditAnnouncemnetDialog({})">Add</v-btn>
        <v-flex xs12 text-xs-left v-if="!addEnable">
          Maximum {{announcementsLimit}} announcements is allowed. If you reach the limit, please delete the old one first or contact customer support for more.
        </v-flex>
        <v-data-table
          :headers="headers"
          :items="announcements"
          :pagination.sync="pagination"
          class="elevation-2 myDense">
          <template v-slot:items="props">
            <td class="subheading">{{ toDateString(props.item.startDate) }}</td>
            <td class="subheading">{{ toDateString(props.item.endDate) }}</td>
            <td class="subheading annoucemnet-msgContent">{{ props.item.msgContent}}</td>
            <td class="text-xs-center">
              <v-layout>
                <v-flex><v-btn dark color="primary" flat @click.stop="showEditAnnouncemnetDialog(props.item)">Edit</v-btn></v-flex>
                <v-flex><v-btn dark color="secondary" flat @click.stop="deleteAnnouncement(props.item)">Delete</v-btn></v-flex>
              </v-layout>
            </td>
          </template>
        </v-data-table>
      </v-flex>
    </v-layout>
    
    <AnnouncementEdit
      :title="title"
      v-model="editAnnouncementDialog"
      v-if="editAnnouncementDialog"
      :actionFunc="editAnnouncementFunc"
      :announcement="announcementInEdit"
    ></AnnouncementEdit>
  </v-container>
</template>

<script>
import AnnouncementEdit from './AnnouncementEdit'
import { timeTools } from '@/utils/tools'

export default {
  name: 'AnnouncementSettings',
  components: {AnnouncementEdit},
  mixins: [timeTools],
  data () {
    return {
      headers: [
        { text: 'Start date', align: 'left', sortable: true, value: 'startDate' },
        { text: 'End date', align: 'left', sortable: true, value: 'endDate' },
        { text: 'Content', align: 'left', sortable: false, value: 'msgContent', width: '60%' },
        { text: 'Action', value: 'note', align: 'center', sortable: false, width: '10%' }
      ],
      startDatePicker: false,
      endDatePicker: false,
      announcementInEdit: {},
      editAnnouncementDialog: false,
      pagination: {
        sortBy: 'startDate'
      },
      title: ''
    }
  },
  computed: {
    isWarehouse () {
      return !!this.$store.getters.activeWarehouse
    },
    isOrganization () {
      return !!this.$store.getters.activeOrganization
    },
    isAdmin () {
      return !!(this.$store.getters.user || {}).isAdmin
    },
    announcements () {
      if (this.isWarehouse) {
        return this.$store.getters.warehouseAnnouncements
      } else if (this.isOrganization) {
        return this.$store.getters.tenantAnnouncements
      } else if (this.isAdmin) {
        return this.$store.getters.adminAnnouncements
      } 
      return []
    },
    announcementsLimit () {
      const {announcementsLimit: warehouseLimit} = this.$store.getters.warehouseInfo
      const {announcementsLimit: tenantLimit} = this.$store.getters.tenant 
      return warehouseLimit || tenantLimit || 3
    },
    addEnable () {
      return this.isAdmin || !!(this.announcementsLimit > this.announcements.length)
    }
  },
  methods: {
    showEditAnnouncemnetDialog (item) {
      this.editAnnouncementDialog = true
      this.announcementInEdit = item
      this.title = (item._key ? 'Edit' : 'Add') + ' announcement'
    },
    deleteAnnouncement (item) {
      if (!confirm('Do you still want to delete this announcement?')) return Promise.resolve()
      return this.$store.dispatch('deleteAnnouncement', item)
    },
    editAnnouncementFunc (item) {
      return item._key ? this.editAnnouncement(item) : this.addAnnouncement(item)
    },
    editAnnouncement (item) {
      return this.$store.dispatch('updateAnnouncement', item)
    },
    addAnnouncement (item) {
      return this.$store.dispatch('addAnnouncement', item)
    }
  }
}
</script>

<style>
.annoucemnet-msgContent {
  max-width: 50em;
  overflow: auto;
  white-space: pre-wrap;
  word-wrap: break-word;
}
</style>
