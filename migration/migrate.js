let program = require('commander')
let admin = require('firebase-admin')

// guideline:
// 1. the migration should query as little document as possible. May need to consider finish migration in a few batches if data is too large
// 2. migration should be able to re-runnable
//

program
  .option('-e, --env <env>', 'run mode', /^(production-Careful|core|development)$/i, 'development')
  .option('-r, --run <actionName>', 'Name of action, suffix of migration file')
  .allowUnknownOption(true)
  .parse(process.argv)

process.env.NODE_ENV = program.env
let certPath

if (program.env === 'production-Careful') {
  certPath = '../config/cert/prod-cert.json'
} else if (program.env === 'core') {
  certPath = '../config/cert/core-cert.json'
} else {
  certPath = '../config/cert/dev-cert.json'
}

console.log(`==================================================`)
console.log(`==========run migration on ${program.env}=========`)
console.log(`==================================================`)
console.log(`certPath ${certPath}\n\n`)

let serviceAccount = require(certPath)

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://' + serviceAccount.project_id + '.firebaseio.com'
})

let db = admin.firestore()
const settings = { timestampsInSnapshots: true }
db.settings(settings)

console.log('start running action: ', program.run)
let runnerPromise, action
switch (program.run) {
  case 'fix_usps_upc':
    action = require('./migrations/20181107010101_fix_usps_upc')
    runnerPromise = action(db, program.env)
    break
  case 'fix_lastModifedTime':
    action = require('./migrations/20181114010101_fix_transaction_lastModifiedTime')
    runnerPromise = action(db, program.env)
    break
  case 'fix_package_confirm_no_transaction':
    action = require('./migrations/20181113010101_fix_package_confirm_but_no_transaction')
    runnerPromise = action(db, program.env)
    break
  case 'fix_balance_not_updated':
    action = require('./migrations/20181114160101_fix_balance_not_updated')
    runnerPromise = action(db, program.env)
    break
  case 'change_balance_key':
    action = require('./migrations/20181115160101_change_balance_key')
    runnerPromise = action(db, program.env)
    break
  case 'fix_asin':
    action = require('./migrations/20181116000000_fix_asin.js')
    runnerPromise = action(db)
    break
  case 'change_transaction_trackingConfirmed':
    action = require('./migrations/20181126010101_change_transaction_trackingConfirmed.js')
    runnerPromise = action(db)
    break
  case 'change_user_inventory_key':
    action = require('./migrations/20181126020101_change_user_inventory_key.js')
    runnerPromise = action(db)
    break
  case 'create_warehouse_inventory':
    action = require('./migrations/20181129000000_create_warehouse_inventory.js')
    runnerPromise = action(db)
    break
  case 'fix_upcs':
    action = require('./migrations/20181205154900_fix_upc')
    runnerPromise = action(db, program.env)
    break
  case 'fix_trackings':
    action = require('./migrations/20181202163800_fix_trackings')
    runnerPromise = action(db, program.env)
    break
  case 'fix_userVisible':
    action = require('./migrations/20181129161400_fix_userVisible')
    runnerPromise = action(db, program.env)
    break
  case 'initial_warehouse_billings':
    action = require('./migrations/20181220000000_initial_warehouse_billing')
    runnerPromise = action(db, program.env)
    break
  case 'fix_userVisible_fake_array':
    action = require('./migrations/20181222010101_fix_userVisible_fake_array')
    runnerPromise = action(db)
    break
  case 'fix_searchKeywords':
    action = require('./migrations/20181230000001_fix_offerSearchKeywords')
    runnerPromise = action(db)
    break
  case 'fix_transaction_inbound_searchKeywords':
    action = require('./migrations/20181230000002_fix_transaction_inbound_searchKeywords')
    runnerPromise = action(db)
    break
  case 'fix_proposes':
    action = require('./migrations/20190118000001_fix_proposed_offer')
    runnerPromise = action(db)
    break
  case 'fix_pendingPeriod':
    action = require('./migrations/20190224000001_fix_pendingPeriod')
    runnerPromise = action(db)
    break
  case 'fix_payment_comment':
    action = require('./migrations/20190223000001_fix_payment_initial_comment_createTime')
    runnerPromise = action(db)
    break
  case 'fix_blockPaymentRequest':
    action = require('./migrations/20190310010101_fix_users_blockPaymentRequest')
    runnerPromise = action(db)
    break
  case 'fix_pendingPeriod_transaction':
    action = require('./migrations/20190506010101_fix_pendingPeriod')
    runnerPromise = action(db)
    break
  case 'check_inventory':
    action = require('./migrations/20190520010101_check_tenant_inventory_inbound_quantity_isString')
    runnerPromise = action(db)
    break
  case 'fix_package_quantity':
    action = require('./migrations/20190530010101_fix_package_quantity')
    runnerPromise = action(db)
    break
  case 'fix_warehouse_inventory':
    action = require('./migrations/20190819010101_fix_warehouse_inventory')
    runnerPromise = action(db)
    break
  case 'remove_zero_quantity_user_inventory':
    action = require('./migrations/20191014150701_remove_zero_quantity_user_inventory')
    runnerPromise = action(db)
    break
  case 'add_offer_lastEditTime':
    action = require('./migrations/20191211010101_add_offer_lastEditTime')
    runnerPromise = action(db)
    break
  case 'fix_product_transfer':
    action = require('./migrations/20200109010101_fix_product_transfer')
    runnerPromise = action(db)
    break
  case 'fix_change_log':
    action = require('./migrations/20200114010101_fix_change_log')
    runnerPromise = action(db)
    break
  case 'fix_transaction_cancel':
    action = require('./migrations/20200127010101_fix_isCanceledTransfers')
    runnerPromise = action(db)
    break
  case 'fix_stat':
    action = require('./migrations/20200131010101_fix_statistics')
    runnerPromise = action(db)
    break
  case 'fix_warehouse_distribution_0':
    action = require('./migrations/20200214095517_clean_warehouse_distribution_0_fields')
    runnerPromise = action(db)
    break
  case 'add_keywords_for_shipments':
    action = require('./migrations/20200220151338_add_keywords_for_shipments_after_20200101')
    runnerPromise = action(db)
    break
  case 'add_transfer_to_price_history':
    action = require('./migrations/20200321144700_add_product_transfer_to_priceHistory_and_sort')
    runnerPromise = action(db)
    break
  case 'add_offer_to_price_history':
    action = require('./migrations/20200322141800_add_price_history_from_offer_and_sort')
    runnerPromise = action(db)
    break
  case 'fix_shipment_id':
    action = require('./migrations/20200325010101_fix_shipment_id')
    runnerPromise = action(db)
    break
  case 'update_active_task_search_keywords':
    action = require('./migrations/20200429101009_add_searchKeywords_for_active_task')
    runnerPromise = action(db)
    break
  case 'query':
    action = require('./migrations/20200518010101_query_inventory')
    runnerPromise = action(db)
    break
  case 'init_auth':
    action = require('./migrations/20200529010101_init_auth')
    runnerPromise = action(db, admin)
    break
  case 'fix_inventory':
    action = require('./migrations/20200608010101_fix_tenant_distribution')
    runnerPromise = action(db, admin)
    break
  case 'make_users_for_tenant':
    action = require('./migrations/2020071517501_make_users_for_tenant_doc')
    runnerPromise = action(db)
    break
  case 'add_support_keywords':
    action = require('./migrations/2020072015031_add_support_keywords')
    runnerPromise = action(db)
    break
  case 'fix_offer_warehouse_key_lost':
    action = require('./migrations/20200725232850_fix_offer_warehouseKeys_lost')
    runnerPromise = action(db)
    break
  case 'fix_tenant_role':
    action = require('./migrations/20200916010101_fix_tenant_role')
    runnerPromise = action(db)
    break
  case 'update_label_services':
    action = require('./migrations/20200831133000_update_label_services_to_system')
    runnerPromise = action(db)
    break
  case 'restore_offers':
    action = require('./migrations/20200923123609_restore_offers_by_offer_id')
    runnerPromise = action(db, program)
    break
  case 'add_order_processTime':
    action = require('./migrations/20200928195402_add_processTime_to_processed_orders')
    runnerPromise = action(db)
    break
  case 'fix_dist':
    action = require('./migrations/20201001010101_fix_self_distribution')
    runnerPromise = action(db)
    break
  case 'add_email_limitedInfo':
    action = require('./migrations/20201020010101_add_email_limitedInfo')
    runnerPromise = action(db)
    break
  case 'fix_label_status':
    action = require('./migrations/2020111911180_fix_label_status')
    runnerPromise = action(db)
    break
  case 'fix_client_name':
    action = require('./migrations/20201123010101_fix_client_name')
    runnerPromise = action(db)
    break
  case 'fix_label_template':
    action = require('./migrations/20210106010101_fix_label_template')
    runnerPromise = action(db)
    break
  case 'restore_warehouse_statistics':
    action = require('./migrations/20210129010101_restore_warehouse_statistics')
    runnerPromise = action(db)
    break
  case 'fix_clients_expense_history':
    action = require('./migrations/20210222042701_fix_clients_expense_history')
    runnerPromise = action(db)
    break
  case 'build_cancel_label_transaction_details':
    action = require('./migrations/20210321010101_build_cancel_label_transaction_details.js')
    runnerPromise = action(db)
    break
  case 'migrate_audit_to_upc':
    action = require('./migrations/20210405010101_audit_to_upc')
    runnerPromise = action(db)
    break
  case 'migrate_amazon_site':
    action = require('./migrations/20210408010101_migrate_amazon_sites')
    runnerPromise = action(db)
    break
  case 'migrate_location':
    action = require('./migrations/20210514010101_migrate_location')
    runnerPromise = action(db)
    break
  case 'migrate_dailyInbound':
    action = require('./migrations/20210614010101_migrate_dailyInbound')
    runnerPromise = action(db)
    break
  case 'migrate_dailyInbound2':
    action = require('./migrations/20210615010101_migrate_dailyInbound')
    runnerPromise = action(db)
    break
  case 'migrate_shipmentsn':
    action = require('./migrations/20210716010101_migrate_shipment_sn')
    runnerPromise = action(db)
    break
    
  default:
    console.error(`*** Didn't find the action *** `)
}

Promise.resolve(runnerPromise).then(() => {
  console.log('Finished!')
})
