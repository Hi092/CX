// 云函数：更新店铺设置（管理端调用）
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const CONFIG_DOC_ID = 'shop_config_v1'
const DEFAULT_PASSWORD = '123456'

async function verifyAdmin(inputPwd) {
  if (!inputPwd) return false
  try {
    var data = null
    try {
      var cfg = await db.collection('products').doc(CONFIG_DOC_ID).get()
      if (cfg.data) data = cfg.data
    } catch (e1) {}
    if (!data) {
      try {
        var res = await db.collection('settings').doc('shop').get()
        if (res.data) data = res.data
      } catch (e2) {}
    }
    var shopPassword = data && (data.shopPassword || data.password)
    if (!shopPassword) shopPassword = DEFAULT_PASSWORD
    return inputPwd === shopPassword
  } catch (err) {
    return false
  }
}

exports.main = async (event, context) => {
  const data = event.data || {}

  try {
    // 管理端鉴权
    var isAdmin = await verifyAdmin(event._adminPwd)
    if (!isAdmin) return { success: false, error: 'NO_PERMISSION', message: '管理密码错误' }

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
    console.error('updateSettings错误', e)
    return { success: false, error: e.message }
  }
}
