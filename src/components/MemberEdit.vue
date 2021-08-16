<template>
  <FormSubmitPopup
    :title="title"
    v-model="value"
    @popupClose="$emit('input', false)"
    :rightMethod="onSubmitted"
    :medium="!isUser">
    <template v-slot:input v-if="isUser">
      <v-text-field
        id="user_name"
        label="User name"
        v-model="user.name"
        disabled
        ></v-text-field>
      <v-radio-group v-model="status">
        <v-radio
            v-for="n in 3"
            :key="n"
            :label="`${radioLabel[n-1]}`"
            :value="n"
        ></v-radio>
      </v-radio-group>
      <v-autocomplete
        clearable
        label="Groups"
        multiple
        chips
        deletable-chips
        v-model="groupKeys"
        item-text="name"
        item-value="groupKey"
        :items="groups"></v-autocomplete>
    </template>
    <template v-slot:input v-else>
      <v-text-field
        id="groupName"
        label="Group name"
        v-model="groupInEdit.name"
        ></v-text-field>
      <v-autocomplete
        v-model="groupMember"
        :items="allUsers"
        label="Selected users"
        item-text="name"
        item-value="uid"
        return-object
        multiple
        chips
        deletable-chips></v-autocomplete>
    </template>
  </FormSubmitPopup>
</template>

<script>
import FormSubmitPopup from './FormSubmitPopup'

export default {
  name: 'MemberEdit',
  components: {
    FormSubmitPopup
  },
  data () {
    return {
      radioLabel: ['Blocked', 'Limited', 'Accepted'],
      status: null,
      groupInEdit: {},
      groupMember: [],
      groupKeys: [],
      initGroupKeys: []
    }
  },
  mounted () {
    if (!this.isUser) {
      this.groupInEdit = {
        name: this.group.name,
        members: this.group.members || [],
        groupKey: this.group.groupKey
      }
      this.groupMember = []
      this.groupInEdit.members.forEach((member) => {
        this.allUsers.forEach((user) => {
          if (user.uid === member.uid) {
            this.groupMember.push(user)
          }
        })
      })
    } else {
      this.initGroupKeys = this.$store.getters.groups
        .filter(group => group.members.some(member => member.uid === this.user.uid))
        .map(group => group.groupKey)
      this.groupKeys = [...this.initGroupKeys]
      if (this.isRequest) {
        this.status = 3
      } else {
        this.status = this.user.approvalType
      }
    } 
  },
  computed: {
    onSubmitted () {
      if (this.isUser) {
        if (this.isRequest) {
          return this.onAddUser
        }
        return this.onEditUserSubmitted
      }
      if (!this.isEditGroup) {
        return this.onAddGroupSubmitted
      } else {
        return this.onEditGroupSubmitted
      }
    },
    allUsers () {
      let allUsers = []
      this.$store.getters.users.forEach((user) => {
        allUsers.push({
          name: user.name,
          uid: user.uid
        })
      })
      return allUsers
    },
    groups () {
      return this.$store.getters.groups
    }
  },
  methods: {
    onAddGroupSubmitted () {
      let groupDetail = {
        name: this.groupInEdit.name,
        members: []
      }
      this.groupMember.forEach((member) => {
        groupDetail.members.push({
          name: member.name,
          uid: member.uid
        })
      })
      return this.$store.dispatch('addGroup', groupDetail)
    },
    onEditGroupSubmitted () {
      let {name, groupKey} = this.groupInEdit
      return this.$store.dispatch('editGroup', {
        name,
        members: this.groupMember,
        groupKey
      })
    },
    onEditUserSubmitted () {
      const userDetail = {
        approvalType: this.status,
        userKey: this.user.uid
      }
      return this.$store.dispatch('editUserGroups', {...this.user, groupKeys: this.groupKeys, initGroupKeys: this.initGroupKeys})
        .then(() => this.$store.dispatch('editUserStatus', userDetail))
    },
    acceptUser (user) {
      const handleDetail = {
        request: {
          uid: user.uid,
          requestKey: user.requestKey,
          tenantKey: user.tenantKey
        },
        approvalType: 3
      }
      return this.$store.dispatch('handleUserRequest', handleDetail)
    },
    onAddUser () {
      return this.$store.dispatch('editUserGroups', {...this.user, groupKeys: this.groupKeys, initGroupKeys: this.initGroupKeys})
        .then(() => this.acceptUser(this.user))
    }
  },
  props: {
    title: String,
    value: Boolean,
    isUser: Boolean,
    user: Object,
    group: Object,
    isEditGroup: Boolean,
    isRequest: Boolean,
    actionText: {
      type: String,
      default: 'ADD'
    }
  }
}
</script>

<style>
.x-small.btn  {
  height: 25px;
  width: 25px;
  margin: 5px 4px;
}
</style>
