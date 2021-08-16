<template>
  <v-container fluid>
    <v-card>
      <v-snackbar
        :timeout="30000"
        :top="true"
        :color="toastColor"
        v-model="toastEnable"
      >
        {{ toastText }}
        <v-btn dark flat @click.stop="toastEnable = false">Close</v-btn>
      </v-snackbar>
    </v-card>
    <v-btn fab dark fixed bottom right color="blue" @click="showAddUserDialog" title="add user">
      <v-icon dark>add</v-icon>
    </v-btn>
    <v-layout>
      <v-flex>
        <v-layout class="headline mb-5">Staff</v-layout>
      </v-flex>
    </v-layout>
    <v-layout class="subheading" align-baseline>
      <v-flex xs12 md3>Name</v-flex>
      <v-flex xs12 md3 class="text-xs-left">Email</v-flex>
      <v-flex xs12 md3 class="text-xs-left">Role</v-flex>
      <v-flex xs12 md2 class="text-xs-center">Action</v-flex>
    </v-layout>
    <v-divider class="mb-3" ></v-divider>
    <v-layout align-baseline v-for="(item, index) in users" :key="item.name + index">
      <v-flex xs12 md3>{{item.name}}</v-flex>
      <v-flex xs12 md3 class="text-xs-left"><p style="text-align: left">{{ item.email }}</p></v-flex>
      <v-flex xs12 md3 class="text-xs-left"><v-chip v-for="role in item.roles" :key="role">{{ permissionValueToText.get(role) }}</v-chip></v-flex>
      <v-flex xs12 md2 class="text-xs-center">
        <v-btn dark color="primary" flat @click.stop="showEditUserDialog(item)" v-if="index !== 0">Edit</v-btn>
        <v-btn dark color="primary" flat @click.stop="removeUser(item)" v-if="index !== 0">Delete</v-btn>
        <span v-else>Owner</span>
      </v-flex>
    </v-layout>
    <PermissionEditPopup
      :isEdit="isEdit"
      v-model="roleEditDialog"
      v-if="roleEditDialog"
      :initUser="userInEdit"
      :actionFunc="isEdit ? editUser : addUser"/>
  </v-container>
</template>

<script>
import SimpleTextPopup from './SimpleTextPopup'
import PermissionEditPopup from './PermissionEditPopup'

export default {
  name: 'Permission',
  components: {
    SimpleTextPopup,
    PermissionEditPopup
  },
  data () {
    return {
      toastColor: 'error',
      toastEnable: false,
      toastText: '',
      roleEditDialog: false,
      userInEdit: {},
      isEdit: ''
    }
  },
  computed: {
    users () {
      return this.$store.getters.warehouseInfo.users
    },
    permissionValueToText () {
      return this.$store.getters.permissionValueToText
    }
  },
  methods: {
    showAddUserDialog () {
      this.roleEditDialog = true
      this.userInEdit = {}
      this.isEdit = false
    },
    showEditUserDialog (user) {
      this.roleEditDialog = true
      this.userInEdit = user
      this.isEdit = true
    },
    dispatchAndToast (promise) {
      return promise
        .catch(error => {
          this.$store.dispatch('showToast', {info: error.message})
          throw error
        })
    },
    addUser (user) {
      if (this.users && this.users.some(item => item.email === user.email)) return alert('This user has already been added.')
      return this.dispatchAndToast(this.$store.dispatch('addUserToWarehouse', user))
    },
    editUser (user) {
      return this.dispatchAndToast(this.$store.dispatch('editUserForWarehouse', user))
    },
    removeUser (user) {
      if (!confirm('Do you want to remove this user?')) return
      return this.dispatchAndToast(this.$store.dispatch('removeUserFromWarehouse', user))
    },
    showToast (text, level = 'error') {
      this.toastText = text
      this.toastColor = level
      this.toastEnable = true
    }
  }
}
</script>
