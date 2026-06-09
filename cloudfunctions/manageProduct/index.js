const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const CONFIG_DOC_ID = 'shop_config_v1'

async function saveShopConfig(data) {
  var cfg = Object.assign({}, data || {})
  delete cfg._id
  delete cfg._openid
  cfg._type = 'shopConfig'
  cfg.key = 'shopSettings'
  cfg.updateTime = db.serverDate()

  try {
    var old = await db.collection('products').doc(CONFIG_DOC_ID).get()
    var merged = Object.assign({}, old.data || {}, cfg)
    delete merged._id
    delete merged._openid
    await db.collection('products').doc(CONFIG_DOC_ID).set({ data: merged })
  } catch (e) {
    await db.collection('products').doc(CONFIG_DOC_ID).set({ data: cfg })
  }

  try {
    await db.collection('settings').doc('shop').update({ data: data })
  } catch (e2) {
    await db.collection('settings').doc('shop').set({ data: data })
  }
}

exports.main = async (event, context) => {
  try {
    const { action, id, data } = event

    if ((action === 'delete' || action === 'update' || action === 'toggleStatus') && id === CONFIG_DOC_ID) {
      return { success: false, error: 'Cannot modify config document as product' }
    }

    if (action === 'delete') {
      await db.collection('products').doc(id).remove()
      return { success: true }
    }

    if (action === 'update') {
      if (!id) return { success: false, error: '缺少商品ID' }
      delete data._id
      delete data._openid
      delete data.createTime
      data.updateTime = db.serverDate()
      await db.collection('products').doc(id).update({ data: data })
      return { success: true }
    }

    if (action === 'create') {
      delete data._id
      delete data._openid
      data.updateTime = db.serverDate()
      if (!data.createTime) data.createTime = db.serverDate()
      if (!data.status) data.status = 'on'
      if (data.sales === undefined) data.sales = 0
      const res = await db.collection('products').add({ data: data })
      return { success: true, id: res._id }
    }

    if (action === 'toggleStatus') {
      await db.collection('products').doc(id).update({ data: { status: data.status } })
      return { success: true }
    }

    if (action === 'saveSettings') {
      await saveShopConfig(data || {})
      return { success: true, action: 'saveSettings' }
    }

    if (action === 'saveCategories') {
      await saveShopConfig({ categories: data || [] })
      return { success: true, action: 'saveCategories' }
    }

    return { success: false, error: 'Unknown action' }
  } catch (e) {
    return { success: false, error: e.message }
  }
}
