const program = require('commander')
const admin = require('firebase-admin')
const xlsx = require('xlsx')
const { default: axios } = require('axios')

const currentDate = new Date()

async function insertProductsToFirestore (tenantKey, filePath) {
  process.env.NODE_ENV = program.env
  const isAddTemplate = program.labelTemplate
  let certPath

  if (program.env === 'production-Careful') {
    certPath = '../config/cert/prod-cert.json'
  } else if (program.env === 'core') {
    certPath = '../config/cert/core-cert.json'
  } else {
    certPath = '../config/cert/dev-cert.json'
  }

  const processPackages = (() => {
    switch (program.env) {
      case 'production-Careful': 
        return 'https://us-central1-viteusa-prod.cloudfunctions.net/processPackages'
      case 'core':
        return 'https://us-central1-easygo-core.cloudfunctions.net/processPackages'
      case 'development': 
      default:
        return 'https://us-central1-easywarehouse-1610a.cloudfunctions.net/processPackages'
    }
  })()

  console.log(`==================================================`)
  console.log(`==========run on ${program.env}=========`)
  console.log(`==================================================`)

  let serviceAccount = require(certPath)

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://' + serviceAccount.project_id + '.firebaseio.com'
  })

  let db = admin.firestore()
  const settings = { timestampsInSnapshots: true }
  db.settings(settings)

  const products = generateProductsFromFile(filePath)
  if (!products.length) {
    console.log('No products for insert!')
    return
  }

  const productsCol = await db
    .collection(`tenants/${tenantKey}/inventory`)
    .get()
  const upcSet = new Set()
  const skuSet = new Set()
  let processPkgList = []
  productsCol.forEach(productDoc => {
    const { upc = '', sku = [] } = productDoc.data()

    upc && upcSet.add(upc)
    sku.length &&
      sku.forEach(skuStr => {
        skuStr && skuSet.add(skuStr)
      })
  })

  await db.runTransaction(async transaction => {
    const tenantRef = db.doc(`tenants/${tenantKey}`)
    const packagingRef = db.doc(`tenants/${tenantKey}/config/packagings`)
    const [tenantDoc, packagingDoc] = await Promise.all([transaction.get(tenantRef), transaction.get(packagingRef)])
    if (!tenantDoc.exists) {
      console.log(`Tenant(${tenantKey}) no exists`)
      return
    }
    let productIndex = Number(tenantDoc.get('productIndex') || 0)
    let pkgs = packagingDoc.get('packagings')
    let packagings = Array.isArray(pkgs) ? pkgs : []
    const pkgLength = packagings.length

    console.log('product list:')
    for (const index in products) {
      const {templates, packaging, ...product} = products[index]
      console.log(
        `---------- Start to update product ${index + 1}  ----------`
      )
      console.log(`Product name: ${product.name}`)
      console.log(`Product UPC: ${product.upc}`)
      console.log(`Product SKU: ${product.sku.join(', ')}`)
      if (
        (product.upc && upcSet.has(product.upc)) ||
        (product.sku.length && product.sku.some(skuStr => skuSet.has(skuStr)))
      ) {
        console.log(`Error: ${product.name} has duplicate upc / sku`)
        console.log(`---------- Update product ${index + 1} error ----------`)

        continue
      }
      productIndex++
      const id = productIndex.toString().padStart(8, '0')
      console.log(`Product Id: ${id}`)

      transaction.set(db.doc(`tenants/${tenantKey}/inventory/${id}`), {
        ...product,
        id
      })
      if (isAddTemplate) {
        console.log(`Updating label template, template counts: ${templates.length}`)
        templates.forEach(template => {
          transaction.set(db.collection(`tenants/${tenantKey}/templates`).doc(), template)
        }) 
        packaging && packagings.push(packaging) &&
          console.log(`Packaging: ${packaging.length}, ${packaging.width}, ${packaging.height}`)
      }
      console.log(`---------- Update product ${index + 1} done ----------`)
      if (product.upc) {
        processPkgList.push({productId: id, upc: product.upc, name: product.name})
      }
    }

    ;(packagings.length > pkgLength) && transaction.update(packagingRef, {
      packagings,
      lastModifiedTime: currentDate
    })
    transaction.update(tenantRef, { productIndex })

    console.log('product list ------------------ end')
    console.log(
      `Insert ${products.length} products to Tenant(${tenantKey}) inventory`
    )
  })

  console.log(`start to link packages`)
  for (let {productId, upc, name} of processPkgList) {
    await axios.post(processPackages, {
      data: {
        overrideKey: '20180601',
        tenantKey,
        productId,
        upc
      }
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    }).then(res => {
      console.log(`link product: ${name} done`)
    }).catch(e => {
      console.log(`link product: ${name}, ${productId}, ${upc} failed`)
    })
  }
}

function generateProductsFromFile (file) {
  let wb = xlsx.readFile(file)
  let ws = wb.Sheets[wb.SheetNames[0]]
  /** @type {object[]} */
  let productList = xlsx.utils.sheet_to_json(ws, { raw: false })
  return productList
    .filter(product => product.name)
    .map(product => {
      let skus = String(product.sku || '')
        .split(',')
        .map(str => str.trim())
      return {
        name: String(product.name || ''),
        upc: String(product.upc || ''),
        asin: String(product.asin || '')
          .split(',')
          .map(str => str.trim()),
        sku: skus,
        price: Number(product.price || 0),
        note: String(product.note || ''),
        condition: 'new',
        distribution: {},
        isArchived: false,
        inbound: 0,
        quantity: 0,
        createTime: currentDate,
        lastModifiedTime: currentDate,
        packaging: product.length
          ? {
            name: skus[0],
            length: Number(product.length || 8),
            width: Number(product.width || 8),
            height: Number(product.height || 8)
          }
          : null,
        templates: skus.map(sku => ({
          createTime: currentDate,
          from: {
            fullName: 'EJWOX Products Inc.'
          },
          instruction: '',
          insuredValue: 0,
          isExpedited: false,
          lastModifiedTime: currentDate,
          memo: '#{orderId}',
          name: sku,
          packaging: skus[0],
          selectedOtherServices: [],
          shippingService: 'FEDEX_GROUND',
          signature: 'NO_SIGNATURE',
          sku: sku,
          weightLb: Number(product.weight || 1)
        }))
      }
    })
}

program
  .option(
    '-e, --env <env>',
    'run mode',
    /^(production-Careful|core|development)$/i,
    'development'
  )
  .option('-lt, --labelTemplate', 'Is it add sku template about labels')
  .command('insert <tenantKey> <file>')
  .description("insert products list to tenant's firestore inventory")
  .action(insertProductsToFirestore)

program.parse(process.argv)
