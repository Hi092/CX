const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const CONFIG_DOC_ID = 'shop_config_v1'

exports.main = async (event, context) => {
  try {
    try {
      var cfg = await db.collection('products').doc(CONFIG_DOC_ID).get()
      if (cfg.data) return { success: true, data: cfg.data, source: 'products_config' }
    } catch (e1) {}

    var res = await db.collection('settings').doc('shop').get()
    return { success: true, data: res.data, source: 'settings' }
  } catch (e) {
    return { success: false, data: null, error: e.message }
  }
}
