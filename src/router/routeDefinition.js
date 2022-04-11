import SignupContinue from '@/components/SignupContinue'
import Signin from '@/components/Signin'
import Upc from '@/components/Upc'
import Warehouse from '@/components/Warehouse'
// import Package from '@/components/Package'
import InventoryTenant from '@/components/InventoryTenant'
import InventoryUser from '@/components/InventoryUser'
import InventoryWarehouse from '@/components/InventoryWarehouse'
// import Organization from '@/components/Organization'
import Permissions from '@/components/Permissions'
import PermissionsTenant from '@/components/PermissionsTenant'
// import Task from '@/components/Task'
// import Offer from '@/components/Offer'
import Profile from '@/components/Profile'
import Member from '@/components/Member'
import ToEveryone from '@/components/ToEveryone'
// import OutBoundHistory from '@/components/OutBoundHistory'
// import PaymentUser from '@/components/PaymentUser'
// import PaymentTenant from '@/components/PaymentTenant'
import GeneralSettings from '@/components/GeneralSettings'
import WarehouseGeneralSettings from '@/components/WarehouseGeneralSettings'
import TenantUploadPackage from '@/components/TenantUploadPackage'
import WarehouseSite from '@/components/WarehouseSite'
import WarehouseAudit from '@/components/WarehouseAudit'
import WarehouseStow from '@/components/WarehouseStow'
import Administrator from '@/components/Administrator'
import BillingClient from '@/components/BillingClient'
import BillingSettings from '@/components/BillingSettings'
import Shipping from '@/components/Shipping'
import PromotionSettings from '@/components/PromotionSettings'
import AnnouncementSettings from '@/components/AnnouncementSettings'
import PackageReportTenant from '@/components/PackageReportTenant'
// import PackageReportWarehouse from '@/components/PackageReportWarehouse'
import ProductTransferTenant from '@/components/ProductTransferTenant'
import ProductTransferWarehouse from '@/components/ProductTransferWarehouse'
import Support from '@/components/Support'
import TenantOrder from '@/components/TenantOrder'
import Label from '@/components/Label'
import LabelAdmin from '@/components/LabelAdmin'
import BillingAdmin from '@/components/BillingAdmin'
import PermissionAdmin from '@/components/PermissionAdmin'
import Prescan from '@/components/Prescan'
import Eei from '@/components/Eei'
import EeiAdmin from '@/components/EeiAdmin'

const routes = {
  inbound: {
    path: '/inbound',
    component: () =>
        import(
          /* webpackChunkName: "Package" */ '@/components/Inbound'
        ),
    meta: {
      auth: [
        'warehouseOwner',
        'warehouseOperator'
      ],
      displayName: 'Inbound'
    }
  },
  upc: {
    path: '/upc',
    component: Upc,
    meta: {
      auth: [
        'warehouseOwner',
        'warehouseSetting'
      ],
      displayName: 'Setting/UPC'
    }
  },
  package: {
    path: '/package',
    // component: Package
    component: () =>
        import(
          /* webpackChunkName: "Package" */ '@/components/Package'
        ),
    props: (route) => ({ selectedTab: route.query.tab }),
    meta: {
      auth: [
        'warehouseOwner',
        'warehouseInventoryViewer',
        'warehouseInventoryAdmin',
        'orgOwner',
        'orgLogisticOperator',
        'orgLogisticAdmin'
      ],
      displayName: 'Package'
    }
  },
  inventoryTenant: {
    path: '/inventoryTenant',
    component: InventoryTenant,
    meta: {
      auth: [
        'orgOwner',
        'orgLogisticAdmin',
        'orgLogisticOperator'
      ],
      displayName: 'Warehouse/Inventory'
    }
  },
  inventoryUser: {
    path: '/inventoryUser',
    component: InventoryUser,
    meta: {
      auth: [
        'user'
      ],
      displayName: 'Inventory'
    }
  },
  inventoryWarehouse: {
    path: '/inventoryWarehouse',
    component: InventoryWarehouse,
    meta: {
      auth: [
        'warehouseOwner',
        'warehouseInventoryViewer',
        'warehouseInventoryAdmin'
      ],
      displayName: 'Inventory'
    }
  },
  billingWarehouse: {
    path: '/billingWarehouse',
    component: BillingClient,
    meta: {
      auth: [
        'warehouseOwner',
        'warehouseBillingAdmin'
      ],
      displayName: 'Billing'
    }
  },
  billingClient: {
    path: '/billingClient',
    component: BillingClient,
    meta: {
      auth: [
        'orgOwner',
        'orgBilling'
      ],
      displayName: 'Billing'
    }
  },
  warehouse: {
    path: '/warehouse',
    component: Warehouse,
    meta: {
      auth: [
        'warehouseOwner',
        'warehouseSetting'
      ],
      displayName: 'Warehouse/Site'
    }
  },
  organization: {
    path: '/organization',
    component: () =>
        import(
          /* webpackChunkName: "setting" */ '@/components/Organization'
        ),
    meta: {
      auth: [
        'warehouseOwner',
        'warehouseOrgAdmin'
      ],
      displayName: 'Setting/Organization'
    }
  },
  permissions: {
    path: '/permissions',
    component: Permissions,
    meta: {
      auth: [
        'warehouseOwner',
        'warehouseStaff'
      ],
      displayName: 'Setting/Staff'
    }
  },
  permissionsTenant: {
    path: '/permissionsTenant',
    component: PermissionsTenant,
    meta: {
      auth: [
        'orgOwner',
        'orgStaff'
      ],
      displayName: 'Setting/Staff'
    }
  },
  offer: {
    path: '/offer',
    // component: Offer
    component: () =>
        import(
          /* webpackChunkName: "Package" */ '@/components/Offer'
        ),
    meta: {
      auth: [
        'orgOwner',
        'orgLogisticAdmin',
        'orgLogisticOperator',
        'user'
      ],
      displayName: 'Offer'
    }
  },
  task: {
    path: '/task',
    // component: Task
    component: () =>
        import(
          /* webpackChunkName: "OutBoundHistory" */ '@/components/Task'
        ),
    meta: {
      auth: [
        'orgOwner',
        'orgLogisticAdmin',
        'orgLogisticOperator',
        'user'
      ],
      displayName: 'Task'
    }
  },
  member: {
    path: '/member',
    component: Member,
    meta: {
      auth: [
        'orgOwner',
        'orgLogisticAdmin'
      ],
      displayName: 'Setting/Member'
    }
  },
  toEveryone: {
    path: '/toEveryone',
    component: ToEveryone,
    meta: {
      auth: [
        'orgOwner',
        'orgLogisticAdmin',
        'orgLogisticOperator',
        'user',
        'warehouseOwner',
        'warehouseOperator'
      ],
      displayName: 'Outbound/Create'
    }
  },
  toEveryoneWithParam: {
    path: '/toEveryone/initDraft',
    component: ToEveryone,
    props: (route) => {
      return { 
        initDraft: route.query
      }
    },
    meta: {
      auth: [
        'orgOwner',
        'orgLogisticAdmin',
        'orgLogisticOperator',
        'user',
        'warehouseOwner',
        'warehouseOperator'
      ],
      displayName: 'Outbound/Create'
    }
  },
  outBoundHistory: {
    path: '/outBoundHistory',
    // component: OutBoundHistory
    component: () =>
        import(
          /* webpackChunkName: "OutBoundHistory" */ '@/components/OutBoundHistory'
        ),
    meta: {
      auth: [
        'orgOwner',
        'orgLogisticAdmin',
        'orgLogisticOperator',
        'user',
        'warehouseOwner',
        'warehouseOperator'
      ],
      displayName: 'Outbound/Status'
    }
  },
  paymentUser: {
    path: '/paymentUser',
    // component: PaymentUser
    component: () =>
        import(
          /* webpackChunkName: "OutBoundHistory" */ '@/components/PaymentUser'
        ),
    meta: {
      auth: [
        'user'
      ],
      displayName: 'Payment'
    }
  },
  paymentTenant: {
    path: '/paymentTenant',
    // component: PaymentTenant
    component: () =>
        import(
          /* webpackChunkName: "OutBoundHistory" */ '@/components/PaymentTenant'
        ),
    meta: {
      auth: [
        'orgOwner',
        'orgPayment'
      ],
      displayName: 'Payment'
    }
  },
  generalSettings: {
    path: '/generalSettings',
    component: GeneralSettings,
    meta: {
      auth: [
        'orgOwner',
        'orgGeneralSetting'
      ],
      displayName: 'Setting/General'
    }
  },
  warehouseGeneralSettings: {
    path: '/warehouseGeneralSettings',
    component: WarehouseGeneralSettings,
    meta: {
      auth: [
        'warehouseOwner',
        'warehouseSetting'
      ],
      displayName: 'Setting/General'
    }
  },
  WarehouseSite: {
    path: '/WarehouseSite',
    component: WarehouseSite,
    meta: {
      auth: [
        'orgOwner',
        'orgLogisticAdmin'
      ],
      displayName: 'Setting/Site'
    }
  },
  WarehouseAudit: {
    path: '/warehouseAudit',
    component: WarehouseAudit,
    meta: {
      auth: [
        'warehouseOwner',
        'warehouseOrgAdmin'
      ],
      displayName: 'Tools/Audit'
    }
  },
  tenantUploadPackage: {
    path: '/tenantUploadPackage',
    component: TenantUploadPackage,
    meta: {
      auth: [
        'orgOwner',
        'orgLogisticOperator'
      ],
      displayName: 'Warehouse/Upload packages'
    }
  },
  administrator: {
    path: '/administrator',
    component: Administrator,
    meta: {
      auth: [
        'sysAdmin',
        'sysAdminStaff'
      ],
      displayName: 'Registration'
    }
  },
  shippingSettings: {
    path: '/shippingSettings',
    component: Shipping,
    meta: {
      auth: [
        'orgOwner',
        'orgLogisticAdmin'
      ],
      displayName: 'Setting/Shipping'
    }
  },
  billingSettings: {
    path: '/billingSettings',
    component: BillingSettings,
    meta: {
      auth: [
        'warehouseOwner',
        'warehouseOrgAdmin'
      ],
      displayName: 'Setting/Fee'
    }
  },
  promotionSettings: {
    path: '/promotionSettings',
    component: PromotionSettings,
    meta: {
      auth: [
        'warehouseOwner',
        'warehouseOrgAdmin'
      ],
      displayName: 'Setting/Promotion'
    }
  },
  announcementSettings: {
    path: '/announcementSettings',
    component: AnnouncementSettings,
    meta: {
      auth: [
        'warehouseOwner',
        'warehouseSetting',
        'sysAdmin',
        'sysAdminStaff',
        'orgOwner'
      ],
      displayName: 'Setting/Announcement'
    }
  },
  packageReportTenant: {
    path: '/packageReportTenant',
    component: PackageReportTenant,
    meta: {
      auth: [
        'orgOwner',
        'orgLogisticAdmin'
      ],
      displayName: 'Warehouse/Export'
    }
  },
  // packageReportWarehouse: {
  //   path: '/packageReportWarehouse',
  //   component: PackageReportWarehouse,
  //   meta: {
  //     auth: [
  //       'warehouseOwner',
  //       'warehouseInventoryViewer',
  //       'warehouseInventoryAdmin'
  //     ]
  //   }
  // },
  productTransferTenant: {
    path: '/productTransferTenant',
    component: ProductTransferTenant,
    meta: {
      auth: [
        'orgOwner',
        'orgLogisticAdmin',
        'orgLogisticOperator'
      ],
      displayName: 'Warehouse/Transfer'
    }
  },
  productTransferWarehouse: {
    path: '/productTransferWarehouse',
    component: ProductTransferWarehouse,
    meta: {
      auth: [
        'warehouseOwner',
        'warehouseInventoryAdmin',
        'warehouseInventoryViewer'
      ],
      displayName: 'Transfer'
    }
  },
  support: {
    path: '/support',
    component: Support,
    meta: {
      auth: [
        'orgOwner',
        'orgLogisticAdmin',
        'orgLogisticOperator',
        'warehouseOwner',
        'warehouseSupport',
        'sysAdmin',
        'sysAdminStaff'
      ],
      displayName: 'Support'
    }
  },
  WarehouseStow: {
    path: '/WarehouseStow',
    component: WarehouseStow,
    meta: {
      auth: [
        'warehouseOwner',
        'warehouseInventoryAdmin',
        'warehouseInventoryViewer',
        'warehouseOperator',
        'warehouseSupport',
        'warehouseReport'
      ],
      displayName: 'WarehouseStow'
    }
  },
  warehouseStat: {
    path: '/warehouseStat',
    // component: Package
    component: () =>
      import(
        /* webpackChunkName: "Stat" */ '@/components/WarehouseStatistics'
      ),
    meta: {
      auth: [
        'warehouseOwner',
        'warehouseReport'
      ],
      displayName: 'Statistics'
    }
  },
  UserPackage: {
    path: '/UserPackage',
    component: () =>
        import(
          /* webpackChunkName" "User" */ '@/components/UserPackage'
        ),
    props: (route) => ({ tracking: route.query.tracking }),
    meta: {
      auth: [
        'user'
      ],
      displayName: 'Warehouse/Package'
    }
  },
  tenantOrder: {
    path: '/tenantOrder',
    component: TenantOrder,
    meta: {
      betaFeature: 'labelAndOrder',
      auth: [
        'orgOwner',
        'orgLogisticAdmin',
        'orgLogisticOperator'
      ],
      displayName: 'Order'
    }
  },
  label: {
    path: '/label',
    component: Label,
    meta: {
      betaFeature: 'labelAndOrder',
      auth: [
        'orgOwner',
        'orgLogisticAdmin',
        'orgLogisticOperator'
      ],
      displayName: 'Label'
    }
  },
  labelForWarehouse: {
    path: '/labelForWarehouse',
    component: Label,
    meta: {
      betaFeature: 'labelAndOrder',
      auth: [
        'warehouseOwner',
        'warehouseOperator',
        'warehouseInventoryViewer',
        'warehouseInventoryAdmin'
      ],
      displayName: 'Label'
    }
  },
  eei: {
    path: '/eei',
    component: Eei,
    meta: {
      betaFeature: 'labelAndOrder',
      auth: [
        'warehouseOwner',
        'warehouseOperator',
        'warehouseInventoryViewer',
        'warehouseInventoryAdmin',
        'orgOwner',
        'orgLogisticAdmin',
        'orgLogisticOperator'
      ],
      displayName: 'Label'
    }
  },
  prescan: {
    path: '/prescan',
    component: Prescan,
    meta: {
      auth: [
        'warehouseOwner',
        'warehouseOperator'
      ],
      displayName: 'Prescan'
    }
  },
  labelAdmin: {
    path: '/labelAdmin',
    component: LabelAdmin,
    meta: {
      auth: [
        'sysAdmin',
        'sysAdminStaff'
      ],
      displayName: 'Label Admin'
    }
  },
  eeiAdmin: {
    path: '/eeiAdmin',
    component: EeiAdmin,
    meta: {
      auth: [
        'sysAdmin',
        'sysAdminStaff'
      ],
      displayName: 'EEI Admin'
    }
  },
  billingAdmin: {
    path: '/billingAdmin',
    component: BillingAdmin,
    meta: {
      auth: [
        'sysAdmin',
        'sysAdminStaff'
      ],
      displayName: 'Billing Admin'
    }
  },
  permissionAdmin: {
    path: '/permissionAdmin',
    component: PermissionAdmin,
    meta: {
      auth: [
        'sysAdmin'
      ],
      displayName: 'Staff Admin'
    }
  },
  profile: {
    path: '/profile',
    component: Profile
  },
  signup: {
    path: '/signupContinue',
    component: SignupContinue
  },
  signin: {
    path: '/signin',
    component: Signin
  },
  default: {
    path: '/',
    name: 'defaultRoute'
  }
}

export default routes
