const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command
const CONFIG_DOC_ID = 'shop_config_v1'

function getOrderTimeTextField(status) {
  if (status === 'paid') return { payTime: db.serverDate() }
  if (status === 'delivering') return { deliveryTime: db.serverDate() }
  if (status === 'completed') return { completeTime: db.serverDate() }
  return {}
}

async function getOwnOrders(openid, status) {
  var result = []
  var seen = {}
  var queries = [
    db.collection('orders').where({ customerOpenid: openid }).orderBy('createTime', 'desc').limit(100).get(),
    db.collection('orders').where({ _openid: openid }).orderBy('createTime', 'desc').limit(100).get()
  ]
  for (var i = 0; i < queries.length; i++) {
    try {
      var res = await queries[i]
      for (var j = 0; j < res.data.length; j++) {
        var item = res.data[j]
        if (seen[item._id]) continue
        if (status && status !== 'all' && item.status !== status) continue
        seen[item._id] = true
        result.push(item)
      }
    } catch (e) {}
  }
  result.sort(function (a, b) {
    var at = a.createTime && a.createTime.getTime ? a.createTime.getTime() : 0
    var bt = b.createTime && b.createTime.getTime ? b.createTime.getTime() : 0
    return bt - at
  })
  return result
}

async function getShopConfig() {
  try {
    var cfg = await db.collection('products').doc(CONFIG_DOC_ID).get()
    if (cfg.data) return cfg.data
  } catch (e1) {}
  try {
    var res = await db.collection('settings').doc('shop').get()
    if (res.data) return res.data
  } catch (e2) {}
  return {}
}

function buildOrderItems(items, productMap) {
  var orderItems = []
  var totalPrice = 0
  for (var i = 0; i < items.length; i++) {
    var it = items[i]
    var productId = it.productId || it._id
    if (!productId || !it.quantity || it.quantity <= 0) return { error: 'INVALID_ITEM' }
    var qty = Math.floor(it.quantity)
    var product = productMap[productId]
    if (!product || product.status === 'off') return { error: 'PRODUCT_UNAVAILABLE', productId: productId, name: it.name }
    if (product.stock !== undefined && product.stock < qty) return { error: 'STOCK_NOT_ENOUGH', productId: productId, name: product.name || it.name, stock: product.stock }
    var price = Math.round(product.price * 100) / 100
    orderItems.push({
      productId: productId,
      name: product.name,
      price: price,
      quantity: qty,
      image: product.image || ''
    })
    totalPrice += price * qty
  }
  totalPrice = Math.round(totalPrice * 100) / 100
  return { orderItems: orderItems, totalPrice: totalPrice }
}

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const action = event.action

  try {
    if (action === 'create') {
      var inputItems = event.items || []
      if (!inputItems || inputItems.length === 0) return { success: false, error: 'EMPTY_ITEMS' }
      var address = event.address
      if (!address) return { success: false, error: 'NO_ADDRESS' }

      var cfg = await getShopConfig()
      if (cfg.shopStatus === '歇业') return { success: false, error: 'SHOP_CLOSED' }

      var productIds = []
      for (var pi = 0; pi < inputItems.length; pi++) {
        var pid = inputItems[pi].productId || inputItems[pi]._id
        if (productIds.indexOf(pid) === -1) productIds.push(pid)
      }
      var productsRes = await db.collection('products').where({ _id: _.in(productIds) }).limit(100).get()
      var productMap = {}
      for (var pd = 0; pd < productsRes.data.length; pd++) productMap[productsRes.data[pd]._id] = productsRes.data[pd]

      var built = buildOrderItems(inputItems, productMap)
      if (built.error) return { success: false, error: built.error, productId: built.productId, name: built.name, stock: built.stock }

      var minPrice = cfg.minPrice !== undefined ? cfg.minPrice : 20
      var deliveryFee = cfg.deliveryFee !== undefined ? cfg.deliveryFee : 3
      var freeDeliveryPrice = cfg.freeDeliveryPrice !== undefined ? cfg.freeDeliveryPrice : 30
      if (built.totalPrice < minPrice) return { success: false, error: 'UNDER_MIN_PRICE', minPrice: minPrice }

      var fee = built.totalPrice >= freeDeliveryPrice ? 0 : deliveryFee
      var finalPrice = Math.round((built.totalPrice + fee) * 100) / 100

      var now = new Date()
      var pad = function (n) { return n < 10 ? '0' + n : '' + n }
      var r = Math.floor(Math.random() * 1000).toString()
      while (r.length < 3) r = '0' + r
      var orderNo = '' + now.getFullYear() + pad(now.getMonth() + 1) + pad(now.getDate()) + pad(now.getHours()) + pad(now.getMinutes()) + pad(now.getSeconds()) + r

      var order = {
        orderNo: orderNo,
        customerOpenid: openid,
        items: built.orderItems,
        totalPrice: built.totalPrice,
        deliveryFee: fee,
        finalPrice: finalPrice,
        address: address,
        remark: event.remark || '',
        status: 'pending',
        createTime: db.serverDate(),
        source: 'miniprogram'
      }
      var addRes = await db.collection('orders').add({ data: order })
      return { success: true, id: addRes._id, orderNo: orderNo, totalPrice: built.totalPrice, deliveryFee: fee, finalPrice: finalPrice }
    }

    if (action === 'pay') {
      var id = event.id
      var orderRes = await db.collection('orders').doc(id).get()
      var order = orderRes.data
      if (!order) return { success: false, error: 'ORDER_NOT_FOUND' }
      if (order.customerOpenid && order.customerOpenid !== openid) return { success: false, error: 'NO_PERMISSION' }
      if (order.status !== 'pending') return { success: true, alreadyPaid: true }

      for (var i = 0; i < order.items.length; i++) {
        var item = order.items[i]
        var p = await db.collection('products').doc(item.productId).get()
        if (!p.data || p.data.status === 'off') return { success: false, error: 'PRODUCT_UNAVAILABLE', productName: item.name }
        if (p.data && p.data.stock !== undefined && p.data.stock < item.quantity) {
          return { success: false, error: 'STOCK_NOT_ENOUGH', productName: item.name }
        }
      }
      for (var j = 0; j < order.items.length; j++) {
        var it = order.items[j]
        await db.collection('products').doc(it.productId).update({
          data: { stock: _.inc(-it.quantity), sales: _.inc(it.quantity) }
        })
      }
      await db.collection('orders').doc(id).update({ data: { status: 'paid', payTime: db.serverDate() } })
      return { success: true }
    }

    if (action === 'listMine') {
      var mine = await getOwnOrders(openid, event.status)
      return { success: true, data: mine }
    }

    if (action === 'badgesMine') {
      var mineOrders = await getOwnOrders(openid, 'all')
      var counts = { pending: 0, paid: 0, delivering: 0 }
      for (var b = 0; b < mineOrders.length; b++) {
        if (counts[mineOrders[b].status] !== undefined) counts[mineOrders[b].status]++
      }
      return { success: true, counts: counts }
    }

    if (action === 'listAdmin') {
      var query = db.collection('orders').orderBy('createTime', 'desc')
      if (event.status && event.status !== 'all') {
        if (event.status === 'todo' || event.status === 'pending') query = query.where({ status: _.in(['pending', 'paid']) })
        else query = query.where({ status: event.status })
      }
      var adminRes = await query.limit(100).get()
      return { success: true, data: adminRes.data }
    }

    if (action === 'statsAdmin') {
      var allRes = await db.collection('orders').orderBy('createTime', 'desc').limit(300).get()
      return { success: true, data: allRes.data }
    }

    if (action === 'updateStatus') {
      var allow = { delivering: true, completed: true, paid: true }
      if (!allow[event.status]) return { success: false, error: 'BAD_STATUS' }
      var data = { status: event.status }
      var extra = getOrderTimeTextField(event.status)
      for (var k in extra) data[k] = extra[k]
      await db.collection('orders').doc(event.id).update({ data: data })
      return { success: true }
    }

    if (action === 'get') {
      var getRes = await db.collection('orders').doc(event.id).get()
      var orderData = getRes.data
      if (!event.admin && orderData.customerOpenid && orderData.customerOpenid !== openid) {
        return { success: false, error: 'NO_PERMISSION' }
      }
      return { success: true, data: orderData }
    }

    return { success: false, error: 'UNKNOWN_ACTION' }
  } catch (e) {
    return { success: false, error: e.message }
  }
}
