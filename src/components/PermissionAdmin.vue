<script>
import Permissions from './Permissions'

export default {
  name: 'PermissionAdmin',
  extends: Permissions,
  computed: {
    users () {
      return this.$store.getters.superUsers
    }
  },
  created () {
    this.$store.dispatch('getSuperUsers')
  },
  destroyed () {
    this.$store.getters.subscribed.superUsers()
  },
  methods: {
    addUser (user) {
      if (this.users && this.users.some(item => item.email === user.email)) return alert('This user has already been added.')
      return this.dispatchAndToast(this.$store.dispatch('addUserToAdmin', user))
    },
    editUser (user) {
      return this.dispatchAndToast(this.$store.dispatch('editUserForAdmin', user))
    },
    removeUser (user) {
      if (!confirm('Do you want to remove this user?')) return
      return this.dispatchAndToast(this.$store.dispatch('removeUserFromAdmin', user))
    }
  }
}
</script>
