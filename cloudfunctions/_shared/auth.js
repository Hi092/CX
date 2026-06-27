/**
 * 云函数管理端鉴权工具
 * 统一校验admin密码，避免每个函数重复写
 */
const cloud = require('wx-server-sdk')
const db = cloud.database()
const CONFIG_DOC_ID = 'shop_config_v1'
const DEFAULT_PASSWORD = '123456'

async function verifyAdminPassword(inputPwd) {
  if (!inputPwd) return { valid: false, message: '缺少管理密码' }

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

    if (inputPwd === shopPassword) {
      return { valid: true }
    }
    return { valid: false, message: '密码错误' }
  } catch (err) {
    return { valid: false, message: '验证失败' }
  }
}

function requireAdmin(event) {
  return event && event._adminPwd
}

module.exports = {
  verifyAdminPassword: verifyAdminPassword,
  requireAdmin: requireAdmin
}
