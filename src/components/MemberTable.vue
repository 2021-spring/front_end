<template>
  <div>
    <v-layout row wrap>
      <v-flex xs12>
        <v-layout justify-space-between>
          <v-flex v-if="showAddGroupButton">
            <v-btn dark color="primary" @click.stop="addGroupFunc"><v-icon dark>add</v-icon>Add group</v-btn>
          </v-flex>
          <v-spacer></v-spacer>
          <v-flex xs8 md2>
            <v-text-field
              append-icon="filter_list"
              label="Search"
              single-line
              hide-details
              v-model="filter"
            ></v-text-field>
          </v-flex>
        </v-layout>
        <v-layout v-if="$attrs.isRealtime" justify-start align-baseline>
          <v-flex class="success--text caption"><span class="realtime-border px-1">REAL TIME</span></v-flex>
        </v-layout>
        <v-data-table
          v-if="type === 'users'"
          :headers="headers"
          :items="users"
          class="elevation-2 myDense"
          :search="filter"
          ref="offerTable"
          :loading="loading"
          :pagination.sync="pagination"
          :rows-per-page-items="rowPerPage">
          <template v-slot:progress>
            <v-progress-linear color="blue" indeterminate></v-progress-linear>
          </template>
          <template v-slot:items="props">
            <td class="text-xs-left">{{ props.index + 1 }}</td>
            <td class="text-xs-left">{{ props.item.name }}</td>
            <td class="text-xs-left">{{ props.item.status }}</td>
            <td class="text-xs-left">
              <v-layout>Email: {{ props.item.email }}</v-layout>
              <v-layout>Note: {{ props.item.note }}</v-layout>
            </td>
            <td class="text-xs-left">{{ props.item.balance }}</td>
            <td class="text-xs-center">
              <v-layout row>
                <v-flex v-if="secondFunc && !props.item.requestKey"><v-btn class="mx-0" dark color="primary" flat @click.stop="secondFunc(props.item)">{{secondActionText}}</v-btn></v-flex>
                <v-flex v-if="props.item.status === 'pending'">
                  <v-btn 
                    class="mx-0" 
                    flat
                    color="primary" 
                    :loading="props.item.isAcceptLoading" 
                    :dark="!props.item.isRejectLoading"
                    :disabled="props.item.isRejectLoading"
                    @click.stop="showSelectGroupDialog(props.item)" 
                    :id="`member${props.index + 1}`"
                  >Accept</v-btn>
                </v-flex>
                <v-flex v-if="props.item.status === 'pending'">
                  <v-btn
                    class="mx-0"
                    color="primary"
                    flat
                    :loading="props.item.isRejectLoading"
                    :dark="!props.item.isAcceptLoading"
                    :disabled="props.item.isAcceptLoading"
                    @click.stop="rejectUser(props.item)"
                  >Reject</v-btn>
                </v-flex>
              </v-layout>
            </td>
          </template>
        </v-data-table>
        <v-data-table
          v-else
          :headers="headers2"
          :items="displayGroups"
          class="elevation-2 myDense"
          :search="filter"
          :loading="loading"
          :pagination.sync="pagination"
          :rows-per-page-items="rowPerPage">
          <template v-slot:progress>
            <v-progress-linear color="blue" indeterminate></v-progress-linear>
          </template>
          <template v-slot:items="props">
            <td class="subheading">{{ props.item.name}}</td>
            <td class="text-xs-left">
              <v-chip v-for="member in props.item.members" :key="member.uid">
                {{member.name}}
              </v-chip>
              </td>
            <td class="text-xs-center">
              <v-layout row lg3>
                <v-flex v-if="firstFunc"><v-btn dark color="primary" flat @click.stop="firstFunc(props.item)">{{firstActionText}}</v-btn></v-flex>
                <v-flex v-if="secondFunc"><v-btn dark color="primary" flat @click.stop="secondFunc(props.item)">{{secondActionText}}</v-btn></v-flex>
              </v-layout>
            </td>
          </template>
        </v-data-table>
      </v-flex>
    </v-layout>
    <MemberEdit
      title="Edit user"
      v-model="selectGroupDialog"
      v-if="selectGroupDialog"
      :isUser="true"
      :isEditGroup="false"
      isRequest
      :user="userInEdit"></MemberEdit>
  </div>
</template>

<script>
import MemberEdit from './MemberEdit'
export default {
  name: 'MemberTable',
  components: {
    MemberEdit
  },
  data () {
    return {
      rowPerPage: [15, 30, 50, {text: 'All', value: -1}],
      pagination: {
        sortBy: 'id'
      },
      filter: '',
      headers: [
        { text: 'Index', align: 'left', sortable: false, value: 'id' },
        { text: 'User', align: 'left', sortable: true, value: 'name' },
        { text: 'Status', align: 'left', sortable: true, value: 'status' },
        { text: 'Info', value: 'email', align: 'left', sortable: false },
        { text: 'Balance', value: 'balance', align: 'left', sortable: true },
        { text: 'Action', value: 'action', align: 'center', sortable: false, width: '20%' }
      ],
      headers2: [
        { text: 'Name', align: 'left', sortable: true, value: 'name' },
        { text: 'Users', value: 'users', align: 'left', sortable: false },
        { text: 'Action', value: 'action', align: 'center', sortable: false, width: '20%' }
      ],
      selectGroupDialog: false,
      userInEdit: {},
      groupKey: ''
    }
  },
  computed: {
    displayGroups () {
      let groups = this.users
      groups.forEach(group => {
        if (group.members) {
          group.members = Object.values(group.members)
        }
      })
      return groups
    },
    loading () {
      return this.$store.getters.loadingMembers
    }
  },
  methods: {
    showSelectGroupDialog (item) {
      this.selectGroupDialog = true
      this.userInEdit = item
    },
    rejectUser (user) {
      this.$set(user, 'isRejectLoading', true)
      const handleDetail = {
        request: {
          uid: user.uid,
          requestKey: user.requestKey,
          tenantKey: user.tenantKey
        },
        approvalType: 0
      }
      return this.$store.dispatch('rejectUserRequest', handleDetail)
        .finally(() => { user.isRejectLoading = false })
    }
  },
  props: {
    users: {
      type: Array,
      default: function () {
        return [{}]
      }
    },
    type: String,
    firstActionText: String,
    firstFunc: Function,
    secondActionText: String,
    secondFunc: Function,
    showAddGroupButton: Boolean,
    addGroupFunc: Function
  }
}
</script>
