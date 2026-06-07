const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const CONFIG_DOC_ID = 'shop_config_v1'

exports.main = async (event, context) => {
  const { password } = event

  try {
    var data = null
    try {
      var cfg = await db.collection('products').doc(CONFIG_DOC_ID).get()
      if (cfg.data) data = cfg.data
    } catch (e1) {}

    if (!data) {
      var res = await db.collection('settings').doc('shop').get()
      data = res.data
    }

    const shopPassword = data && data.shopPassword
    if (!shopPassword) return { success: false, message: '未设置密码' }
    if (password === shopPassword) return { success: true, valid: true, message: '验证成功' }
    return { success: false, valid: false, message: '密码错误' }
  } catch (err) {
    console.error(err)
    return { success: false, valid: false, message: '验证失败' }
  }
}
