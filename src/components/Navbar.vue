<template>
  <div>
    <v-toolbar dark class="primary">
      <v-toolbar-side-icon @click.native.stop="sideNav = !sideNav" v-if="$vuetify.breakpoint.mdAndDown"></v-toolbar-side-icon>
      <v-toolbar-title class="nar"><v-layout align-center><img src="@/assets/vite-logo.jpg" alt="" style="width:80px;"><v-icon left dark class="ml-3">{{userIcon}}</v-icon></v-layout></v-toolbar-title>
      <v-spacer></v-spacer>
      <PromotionWidget />
      <AnnouncementWidget v-if="isUserLogined && !isAdmin" />

      <v-toolbar-items v-if="!$vuetify.breakpoint.mdAndDown">
        <template v-for="item in items" v-if="!item.disabled">
          <v-menu offset-y v-if="!item.link && item.subItems" :key="item.link" :class="'hidden-sm-and-down'">
            <template>
              <v-list dark class="primary">
                <template v-for="subItem in item.subItems">
                  <v-list-tile v-if="!subItem.disabled" :key="subItem.title" @click="$router.push(subItem.link)" :id="subItem.name">
                    <v-list-tile-title>{{ subItem.name }}</v-list-tile-title>
                  </v-list-tile>
                </template>
              </v-list>
            </template>
            <template #activator="data">
              <v-btn  flat dark :class="getManualClass(item)" :to="item.link" v-on="data.on" :id="item.name">{{item.name}}</v-btn>
            </template>
          </v-menu>
          <v-btn v-else flat dark :to="item.link" :key="item.link">{{item.name}}</v-btn>
        </template>
        <v-btn
          v-if="isUserLogined"
          flat
          @click="onLogout"
          id="logout">
          <v-icon left dark>exit_to_app</v-icon>
          Logout
        </v-btn>
      </v-toolbar-items>
    </v-toolbar>
    <v-navigation-drawer v-model="sideNav" temporary absolute>
      <v-list>
        <template v-for="item in items" v-if="item.isShownOnSmallDevices && !item.disabled">
          <v-list-group
            v-model="item.active" 
            :key="item.link" 
            v-if="!item.link && item.subItems"
            no-action
          >
            <template v-slot:activator>
              <v-list-tile>
                <v-list-tile-action><v-icon>tablet</v-icon></v-list-tile-action>
                <v-list-tile-content>{{item.name}}</v-list-tile-content>
              </v-list-tile>
            </template>
            <v-list-tile v-for="subItem in item.subItems" :key="subItem.name" @click="$router.push(subItem.link)" v-if="subItem.isShownOnSmallDevices">
              <v-list-tile-content>
                <v-list-tile-title>{{ subItem.name }}</v-list-tile-title>
              </v-list-tile-content>
            </v-list-tile>
          </v-list-group>
          <v-list-tile v-else @click="$router.push(item.link)" :key="item.link" >
            <v-list-tile-action><v-icon>tablet</v-icon></v-list-tile-action>
            <v-list-tile-content>{{item.name}}</v-list-tile-content>
          </v-list-tile>
        </template>
      </v-list>
      <v-list>
        <v-list-tile
          v-if="isUserLogined"
          @click="onLogout">
          <v-list-tile-action>
            <v-icon>exit_to_app</v-icon>
          </v-list-tile-action>
          <v-list-tile-content class="logout">Logout</v-list-tile-content>
        </v-list-tile>
      </v-list>
      <v-spacer></v-spacer>
      <v-footer>
        <v-layout><v-spacer></v-spacer><v-flex md4>Version: {{version}}</v-flex></v-layout>
      </v-footer>
    </v-navigation-drawer>
    <v-card>
      <v-snackbar
        :top="true"
        :color="toastColor"
        :timeout="30000"
        v-model="toastEnable"
      >
        {{ toastText }}
        <v-btn dark flat @click.stop="closeToast">X</v-btn>
      </v-snackbar>
    </v-card>
    <SimpleTextPopup
      v-model="isReloadNeeded"
      v-if="isReloadNeeded"
      hideLftBtn
      :title="`New release available`"
      :rightButtonText="'Reload'"
      :rightMethod="reloadPage">
      <template v-slot:input>
        <v-container>
          <v-flex style="white-space: pre-wrap; ">{{reloadPageText}}</v-flex>
        </v-container>
      </template>
      </SimpleTextPopup>
    <SimpleTextPopup
      v-model="isSysUpdating"
      v-if="isSysUpdating"
      hideLftBtn
      hideRgtBtn
    >
      <template v-slot:input>
        <v-container>
          <v-layout justify-center>
            <v-progress-circular
              indeterminate
              color="primary"
            ></v-progress-circular>
          </v-layout>
          <v-flex style="white-space: pre-wrap; ">{{ updatingText }}</v-flex>
        </v-container>
      </template>
      </SimpleTextPopup>
      <v-dialog v-model="submitting" fullscreen full-width>
        <v-container fluid fill-height style="background-color: rgba(255, 255, 255, 0.75);">
          <v-layout justify-center align-center>
            <v-progress-circular
              indeterminate
              color="primary">
            </v-progress-circular>
          </v-layout>
        </v-container>
      </v-dialog>
  </div>
</template>

<script>
import SimpleTextPopup from './SimpleTextPopup'
import PromotionWidget from './PromotionWidget'
import AnnouncementWidget from './AnnouncementWidget'
import routeDefinition from '@/router/routeDefinition'

export default {
  name: 'navbar',
  components: {
    SimpleTextPopup,
    PromotionWidget,
    AnnouncementWidget
  },
  data () {
    return {
      sideNav: false,
      announcementToggle: false,
      submitting: false
    }
  },
  computed: {
    roles () {
      return this.$store.getters.user && this.$store.getters.user.roles
    },
    env () {
      return process.env.NODE_ENV
    },
    items () {
      let menuItems = [
        {
          name: 'Signup',
          link: '/signupContinue',
          isShownOnSmallDevices: true
        },
        {
          name: 'Signin',
          link: '/signin',
          isShownOnSmallDevices: true
        }
      ]
      if (this.isUserLogined) {
        menuItems = [
          {
            name: 'Offer',
            link: '/offer',
            isShownOnSmallDevices: true,
            auth: this.getAuthConfig('offer')
          },
          {
            name: 'Task',
            link: '/task',
            isShownOnSmallDevices: true,
            auth: this.getAuthConfig('task')
          },
          {
            name: 'Prescan',
            isShownOnSmallDevices: true,
            link: '/prescan',
            disabled: !this.activatePrescan,
            auth: this.getAuthConfig('prescan')
          },
          {
            name: 'Inbound',
            isShownOnSmallDevices: true,
            link: '/inbound',
            auth: this.getAuthConfig('inbound')
          },
          {
            name: 'Stow',
            isShownOnSmallDevices: true,
            link: '/WarehouseStow',
            auth: this.getAuthConfig('WarehouseStow')
          },
          {
            name: 'Outbound',
            link: this.isUserTenant ? null : '/outBoundHistory', // only show this if not organization
            isShownOnSmallDevices: true,
            subItems: [
              {
                name: 'Create',
                isShownOnSmallDevices: true,
                link: '/toEveryone',
                auth: this.getAuthConfig('toEveryone')
              },
              {
                name: 'Status',
                isShownOnSmallDevices: true,
                link: '/outBoundHistory',
                auth: this.getAuthConfig('outBoundHistory')
              },
              {
                name: 'Label',
                isShownOnSmallDevices: true,
                link: '/label',
                auth: this.getAuthConfig('label'),
                disabled: !this.betaFeatures.includes('labelAndOrder')
              },
              {
                name: 'EEI',
                isShownOnSmallDevices: true,
                link: '/eei',
                auth: this.getAuthConfig('eei'),
                disabled: !this.betaFeatures.includes('labelAndOrder')
              }
            ]
          },
          {
            name: 'Billing',
            isShownOnSmallDevices: true,
            disabled: this.isJustUser || !this.isAdmin,
            link: '/billingAdmin',
            auth: this.getAuthConfig('/billingAdmin')
          },
          {
            name: 'Inventory',
            link: '/inventoryWarehouse',
            isShownOnSmallDevices: true,
            disabled: this.isUserTenant,
            auth: this.getAuthConfig('inventoryWarehouse')
          },
          {
            name: 'Package',
            link: '/package',
            isShownOnSmallDevices: true,
            disabled: this.isUserTenant,
            auth: this.getAuthConfig('package')
          },
          {
            name: 'Order',
            link: '/tenantOrder',
            isShownOnSmallDevices: true,
            disabled: !this.betaFeatures.includes('labelAndOrder'),
            auth: this.getAuthConfig('tenantOrder')
          },
          {
            name: 'Billing',
            link: this.isWarehouse ? '/billingWarehouse' : '/billingClient',
            isShownOnSmallDevices: true,
            auth: this.isWarehouse ? this.getAuthConfig('billingWarehouse') : this.getAuthConfig('billingClient')
          },
          {
            name: 'Label',
            isShownOnSmallDevices: true,
            disabled: !this.isAdmin,
            link: '/labelAdmin',
            auth: this.getAuthConfig('/labelAdmin')
          },
          {
            name: 'EEI',
            isShownOnSmallDevices: true,
            link: '/eeiAdmin',
            auth: this.getAuthConfig('eeiAdmin')
          },
          {
            name: 'Tools',
            isShownOnSmallDevices: true,
            subItems: [
              {
                name: 'Transfer',
                link: '/productTransferWarehouse',
                isShownOnSmallDevices: true,
                disabled: this.isUserTenant,
                auth: this.getAuthConfig('productTransferWarehouse')
              },
              {
                name: 'Statistics',
                link: '/warehouseStat',
                isShownOnSmallDevices: true,
                auth: this.getAuthConfig('warehouseStat')
              },
              {
                name: 'Audit',
                link: '/warehouseAudit',
                isShownOnSmallDevices: true,
                auth: this.getAuthConfig('WarehouseAudit')
              },
              {
                name: 'Label',
                isShownOnSmallDevices: true,
                disabled: !this.isWarehouse || !this.betaFeatures.includes('labelAndOrder'),
                link: '/labelForWarehouse',
                auth: this.getAuthConfig('labelForWarehouse')
              }
            ]
          },
          {
            name: 'Warehouse',
            isShownOnSmallDevices: true,
            disabled: this.isWarehouse || this.isAdmin,
            subItems: [
              {
                name: 'Inventory',
                link: this.isUserTenant ? '/inventoryTenant' : '/inventoryUser',
                isShownOnSmallDevices: true,
                auth: this.isUserTenant ? this.getAuthConfig('inventoryTenant') : this.getAuthConfig('inventoryUser')
              },
              {
                name: 'Package',
                link: '/package',
                isShownOnSmallDevices: true,
                auth: this.getAuthConfig('package')
              },
              {
                name: 'Package',
                link: '/UserPackage',
                auth: this.getAuthConfig('UserPackage'),
                disabled: this.isUserTenant
              },
              {
                name: 'Transfer',
                link: '/productTransferTenant',
                isShownOnSmallDevices: true,
                auth: this.getAuthConfig('productTransferTenant')
              },
              {
                name: 'Site',
                link: '/WarehouseSite',
                isShownOnSmallDevices: true,
                auth: this.getAuthConfig('WarehouseSite')
              },
              {
                name: 'Upload packages',
                link: '/tenantUploadPackage',
                isShownOnSmallDevices: true,
                auth: this.getAuthConfig('tenantUploadPackage')
              },
              {
                name: 'Export',
                link: '/packageReportTenant',
                isShownOnSmallDevices: true,
                auth: this.getAuthConfig('packageReportTenant')
              },
              {
                name: 'Support',
                link: '/support',
                isShownOnSmallDevices: true,
                auth: this.getAuthConfig('support')
              }
            ]
          },
          {
            name: 'Payment',
            link: this.isUserTenant ? '/paymentTenant' : '/paymentUser',
            isShownOnSmallDevices: true,
            auth: this.isUserTenant ? this.getAuthConfig('paymentTenant') : this.getAuthConfig('paymentUser')
          },
          {
            name: 'Support',
            link: '/support',
            disabled: this.isUserTenant,
            isShownOnSmallDevices: true,
            auth: this.getAuthConfig('support')
          },
          {
            name: 'Setting',
            isShownOnSmallDevices: true,
            subItems: [
              {
                name: 'UPC',
                link: '/upc',
                isShownOnSmallDevices: true,
                auth: this.getAuthConfig('upc')
              },
              {
                name: 'Site',
                link: '/warehouse',
                isShownOnSmallDevices: true,
                auth: this.getAuthConfig('warehouse')
              },
              {
                name: 'Organization',
                link: '/organization',
                isShownOnSmallDevices: true,
                auth: this.getAuthConfig('organization')
              },
              {
                name: 'Staff',
                link: this.isWarehouse ? '/permissions' : '/permissionsTenant',
                isShownOnSmallDevices: true,
                auth: this.isWarehouse ? this.getAuthConfig('permissions') : this.getAuthConfig('permissionsTenant')
              },
              {
                name: 'Member',
                link: '/member',
                isShownOnSmallDevices: true,
                auth: this.getAuthConfig('member')
              },
              {
                name: 'General',
                link: this.isWarehouse ? '/warehouseGeneralSettings' : '/generalSettings',
                isShownOnSmallDevices: true,
                auth: this.getAuthConfig(this.isWarehouse ? 'warehouseGeneralSettings' : 'generalSettings')
              },
              {
                name: 'Shipping',
                link: '/shippingSettings',
                isShownOnSmallDevices: true,
                auth: this.getAuthConfig('shippingSettings')
              },
              {
                name: 'Fee',
                link: '/billingSettings',
                isShownOnSmallDevices: true,
                auth: this.getAuthConfig('billingSettings')
              },
              {
                name: 'Promotion',
                link: '/promotionSettings',
                isShownOnSmallDevices: true,
                auth: this.getAuthConfig('promotionSettings')
              },
              {
                name: 'Announcement', // May cause model name & menu item id 
                link: '/announcementSettings',
                isShownOnSmallDevices: true,
                auth: this.getAuthConfig('announcementSettings')
              }
            ]
          },
          {
            name: 'Registration',
            link: '/administrator',
            disabled: !this.isAdmin,
            auth: this.getAuthConfig('administrator')
          },
          {
            name: 'Staff',
            link: '/permissionAdmin',
            isShownOnSmallDevices: true,
            auth: this.getAuthConfig('permissionAdmin')
          },
          {
            name: 'Profile',
            link: '/profile',
            disabled: this.isAdmin,
            isShownOnSmallDevices: true
          }
        ]
        menuItems = this.filterMenu(this.roles, menuItems)
      }
      return menuItems
    },
    isAdmin () {
      return this.$store.getters.user && this.$store.getters.user.isAdmin
    },
    betaFeatures () {
      return this.$store.getters.betaFeatures
    },
    isUserLogined () {
      return !this.$store.getters.userLoading && this.$store.getters.user
    },
    isUserTenant () {
      return this.$store.getters.activeOrganization
    },
    // this is regular user type
    isUser () {
      return (this.$store.getters.userExtra && this.$store.getters.userExtra.role === 1)
    },
    // this is regular user except for warehouse worker
    isJustUser () {
      return (this.$store.getters.userExtra && this.$store.getters.userExtra.role === 1) && !this.isWarehouse && !this.isUserTenant
    },
    isSysUpdating () {
      return this.$store.getters.isSysUpdating
    },
    isReloadNeeded () {
      return this.$store.getters.reloadPage && !this.isSysUpdating
    },
    isWarehouse () {
      return this.$store.getters.activeWarehouse
    },
    isWarehouseWorker () {
      return this.$store.getters.activeWarehouse && this.$store.getters.warehouseInfo.users && this.$store.getters.user.email !== this.$store.getters.warehouseInfo.users[0].email
    },
    version () {
      return process.env.version
    },
    toastEnable () {
      return this.$store.getters.toastEnable
    },
    toastText () {
      return this.$store.getters.toastText
    },
    toastColor () {
      return this.$store.getters.toastColor
    },
    userIcon () {
      if (!this.isUserLogined) {
        return ''
      } else if (this.isAdmin) {
        return 'supervisor_account'
      } else if (this.$store.getters.activeWarehouse) {
        return 'local_shipping'
      } else if (this.$store.getters.activeOrganization) {
        return 'business'
      } else {
        return 'perm_identity'
      }
    },
    reloadPageText () {
      return `A newer version (V${this.$store.getters.newVersion}) of software is available. \nDo you want to reload now?`
    },
    updatingText () {
      return this.$store.getters.updatingText || 'Our system is updating, thanks for your patient...'
    },
    supportNew () {
      return this.$store.getters.supports.length
    },
    activatePrescan () {
      return this.$store.getters.activatePrescan
    }
  },
  methods: {
    getAuthConfig (key) {
      return routeDefinition && routeDefinition[key] && routeDefinition[key].meta && routeDefinition[key].meta.auth
    },
    filterMenu (roles, items) {
      let newItems = []
      items.forEach(item => {
        if (item.subItems && item.subItems.length > 0) {
          let newSubItems = this.filterMenu(roles, item.subItems)
          if (newSubItems.length > 0) {
            newItems.push({...item, subItems: newSubItems})
          }
        } else if (item.auth) {
          if (roles.some(role => item.auth.includes(role))) {
            newItems.push(item)
          }
        } else {
          newItems.push(item)
        }
      })
      return newItems
    },
    getManualClass (item) {
      if (item.subItems) {
        return item.subItems.some(subItem => subItem.link === this.$route.path) ? 'v-btn--active' : ''
      } else {
        return item.link === this.$route.path ? 'v-btn--active' : ''
      }
    },
    reloadPage () {
      location.reload(true)
    },
    cancelReload () {
      this.$store.commit('setReloadPage', false)
    },
    async onLogout () {
      try {
        this.submitting = true
        await this.$store.dispatch('logout')
      } catch (err) {
        console.error('fail to logout: ', err.message)
      } finally {
        this.submitting = false
      }
    },
    closeToast () {
      this.$store.dispatch('closeToast')
    },
    showAnnouncement () {
      this.announcementToggle = !this.announcementToggle
    }
  }
}
</script>

<style>
.notification .v-badge__badge{
  width: 5px;
  height: 5px;
  top: -3px;
  right: -5px;
}

</style>
