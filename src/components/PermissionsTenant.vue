<script>
import Permissions from './Permissions'

export default {
  name: 'PermissionsTenant',
  extends: Permissions,
  computed: {
    users () {
      return this.$store.getters.tenant.users
    }
  },
  methods: {
    addUser (user) {
      if (this.users && this.users.some(item => item.email === user.email)) return alert('This user has already been added.')
      return this.dispatchAndToast(this.$store.dispatch('addUserToTenant', user))
    },
    editUser (user) {
      return this.dispatchAndToast(this.$store.dispatch('editUserForTenant', user))
    },
    removeUser (user) {
      if (!confirm('Do you want to remove this user?')) return
      return this.dispatchAndToast(this.$store.dispatch('removeUserFromTenant', user))
    }
  }
}
</script>
