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
        <v-tab-item v-for="(item, index) in 2" :key="'item' + index">
          <MemberTable 
            v-if="tab === index"
            :showAddGroupDialog="showAddGroupDialog"
            :users="getData()"
            :isRealtime="tab === 1 && index === 1"
            :type="type"
            :firstActionText="firstActionText"
            :firstFunc="firstFunc"
            :secondActionText="secondActionText"
            :secondFunc="secondFunc"
            :showAddGroupButton="index === 1"
            :addGroupFunc="showAddGroupDialog"></MemberTable>
        </v-tab-item>
      </v-tabs-items>
    </v-tabs>
    <MemberEdit
      title="Edit user"
      v-model="editOfferDialog"
      v-if="editOfferDialog"
      :isUser="true"
      :isEditGroup="false"
      :user="userInEdit"></MemberEdit>
    <MemberEdit
      title="Edit group"
      v-model="editGroupDialog"
      v-if="editGroupDialog"
      :isUser="false"
      :isEditGroup="isEditGroup"
      :type="type"
      :group="groupInEdit"></MemberEdit>
  </v-container>
</template>

<script>
import MemberEdit from './MemberEdit'
import MemberTable from './MemberTable'

export default {
  name: 'Member',
  components: {
    MemberTable,
    MemberEdit
  },
  data () {
    return {
      tab: 0,
      type: 'users',
      userInEdit: {},
      groupInEdit: {},
      editOfferDialog: false,
      editGroupDialog: false,
      tabs: [
        'Users', 'Groups'
      ],
      firstActionText: '',
      firstFunc: null,
      isEditGroup: false,
      secondActionText: 'Edit',
      secondFunc: this.showEditOfferDialog
    }
  },
  mounted () {
    this.$store.dispatch('getMemberRequested')
  },
  watch: {
    tab (value) {
      switch (value) {
        case 0:
          this.type = 'users'
          this.firstActionText = ''
          this.firstFunc = null
          this.secondActionText = 'Edit'
          this.secondFunc = this.showEditOfferDialog
          break
        case 1:
          this.type = 'group'
          this.firstActionText = 'Edit'
          this.firstFunc = this.showEditGroupDialog
          this.secondActionText = 'Delete'
          this.secondFunc = this.deleteGroup
          break
        default:
          break
      }
    }
  },
  computed: {
    users () {
      return this.$store.getters.userRequest.concat(this.$store.getters.users)
    },
    groups () {
      return this.$store.getters.groups
    }
  },
  methods: {
    showEditOfferDialog (user) {
      this.userInEdit = user
      this.editOfferDialog = true
    },
    showEditGroupDialog (group) {
      this.groupInEdit = group
      this.editGroupDialog = true
      this.isEditGroup = true
    },
    showAddGroupDialog () {
      this.groupInEdit = {
        name: '',
        members: [],
        groupKey: ''
      }
      this.editGroupDialog = true
      this.isEditGroup = false
    },
    deleteGroup (group) {
      if (confirm('Are you sure to delete this group?')) {
        this.$store.dispatch('deleteGroup', group)
      }
    },
    getData () {
      switch (this.tab) {
        case 0:
          return this.users
        case 1:
          return this.groups
        default:
          return []
      }
    }
  }
}
</script>
