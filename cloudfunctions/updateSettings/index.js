// 云函数：更新店铺设置（管理端调用）
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const CONFIG_DOC_ID = 'shop_config_v1'

exports.main = async (event, context) => {
  const data = event.data || {}

  try {
    try {
      var oldCfg = await db.collection('products').doc(CONFIG_DOC_ID).get()
      var merged = Object.assign({}, oldCfg.data || {}, data)
      delete merged._id
      delete merged._openid
      merged._type = 'shopConfig'
      merged.key = 'shopSettings'
      merged.updateTime = db.serverDate()
      await db.collection('products').doc(CONFIG_DOC_ID).set({ data: merged })
    } catch (e1) {
      var cfg = Object.assign({}, data)
      cfg._type = 'shopConfig'
      cfg.key = 'shopSettings'
      cfg.updateTime = db.serverDate()
      await db.collection('products').doc(CONFIG_DOC_ID).set({ data: cfg })
    }

    try {
      await db.collection('settings').doc('shop').update({ data: data })
      return { success: true, action: 'update' }
    } catch (e2) {
      await db.collection('settings').doc('shop').set({ data: data })
      return { success: true, action: 'create' }
    }
  } catch (e) {
    return { success: false, error: e.message }
  }
}
