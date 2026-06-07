const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

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

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const action = event.action

  try {
    if (action === 'create') {
      var order = event.order || {}
      if (!order.items || order.items.length === 0) return { success: false, error: 'EMPTY_ITEMS' }
      if (!order.address) return { success: false, error: 'NO_ADDRESS' }
      order.customerOpenid = openid
      order.status = 'pending'
      order.createTime = db.serverDate()
      var addRes = await db.collection('orders').add({ data: order })
      return { success: true, id: addRes._id }
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
