<template>
  <FormSubmitPopup
    :title="isEdit ? 'Edit user' : 'Add user'"
    v-model="value"
    :rightMethod="onSubmitted"
    @popupClose="$emit('input', false)"
    large>
    <template v-slot:input>
      <v-layout>
        <v-flex md4>        
          <v-text-field
            label="Email"
            v-model.trim="user.email"
            :rules="[fieldIsRequired('Email')]"
            :readonly="isEdit"></v-text-field>
        </v-flex>
        <v-flex md1></v-flex>
        <v-flex md4 v-if="isEdit">
          <v-text-field
            label="Name"
            v-model="user.name"
            :readonly="isEdit"></v-text-field>
        </v-flex>
      </v-layout>
      <v-list
        subheader
        three-line
      >
        <v-subheader>Roles</v-subheader>
          <v-layout wrap>
            <v-flex 
              v-for="item in roles" 
              :key="item.key"
              md6
            >
              <v-list-tile @click.stop="item.isSelected = !item.isSelected">
                <v-list-tile-action>
                  <v-checkbox
                    @click.stop="item.isSelected = !item.isSelected"
                    :value="item.isSelected"
                  ></v-checkbox>
                </v-list-tile-action>

                <v-list-tile-content>
                  <v-list-tile-title class="text-capitalize">{{ item.text }}</v-list-tile-title>
                  <v-list-tile-sub-title>{{ roleToComponentMap.get(item.key).join(', ') }}</v-list-tile-sub-title>
                </v-list-tile-content>
              </v-list-tile>
            </v-flex>
          </v-layout>
      </v-list>
    </template>
  </FormSubmitPopup>
</template>

<script>
import FormSubmitPopup from './FormSubmitPopup'
import { cloneDeep, checkRules } from '@/utils/tools'

export default {
  name: 'PermissionEditPopup',
  components: {
    FormSubmitPopup
  },
  mixins: [checkRules],
  data () {
    return {
      user: {},
      roles: (this.$store.getters.user.isAdmin ? this.$store.getters.adminRoles : this.$store.getters.allRoles)
        .map(role => {
          return {
            key: role,
            isSelected: false,
            text: this.$store.getters.permissionValueToText.get(role)
          }
        })
    }
  },
  mounted () {
    this.user = cloneDeep(this.initUser)
    const roleSet = new Set(this.user.roles || [])
    this.roles.forEach(role => {
      if (roleSet.has(role.key)) {
        role.isSelected = true
      }
    })
  },
  computed: {
    isAdmin () {
      return !!this.$store.getters.user.isAdmin
    },
    permissionValueToText () {
      return this.$store.getters.permissionValueToText
    },
    roleToComponentMap () {
      return this.$store.getters.roleToComponentMap
    }
  },
  methods: {
    onSubmitted () {
      const roles = this.roles
        .filter(role => role.isSelected)
        .map(role => role.key)
      return this.actionFunc({...this.user, roles})
    }
  },
  props: {
    isEdit: Boolean,
    actionFunc: Function,
    value: Boolean,
    initUser: {
      type: Object,
      default: () => {
        return {}
      }
    }
  }
}
</script>
