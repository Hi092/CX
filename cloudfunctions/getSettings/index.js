const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const CONFIG_DOC_ID = 'shop_config_v1'

exports.main = async (event, context) => {
  try {
    try {
      var configRes = await db.collection('products').doc(CONFIG_DOC_ID).get()
      if (configRes.data) {
        return { success: true, data: configRes.data, source: 'products' }
      }
    } catch (e) {}

    try {
      var settingsRes = await db.collection('settings').doc('shop').get()
      if (settingsRes.data) {
        var d = settingsRes.data
        if (d.shopStatus === undefined) d.shopStatus = '营业中'
        if (d.shopName === undefined) d.shopName = '邻里优选'
        if (d.deliveryFee === undefined) d.deliveryFee = 3
        if (d.freeDeliveryPrice === undefined) d.freeDeliveryPrice = 30
        if (d.minPrice === undefined) d.minPrice = 20
        if (d.themeColor === undefined) d.themeColor = '#4A90D9'
        if (d.password === undefined) d.password = '123456'
        return { success: true, data: d, source: 'settings' }
      }
    } catch (e) {}

    return { success: false, error: 'NO_SETTINGS' }
  } catch (e) {
    return { success: false, error: e.message }
  }
}
