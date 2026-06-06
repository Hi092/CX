const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const CONFIG_DOC_ID = 'shop_config_v1'
const DEFAULT_CATEGORIES = ['饮料', '零食', '方便面', '日用品', '烟酒', '文具', '生鲜']

exports.main = async (event, context) => {
  try {
    var productsRes = await db.collection('products').limit(100).get()
    var products = []
    var settings = null
    for (var i = 0; i < productsRes.data.length; i++) {
      var item = productsRes.data[i]
      if (item._id === CONFIG_DOC_ID || item._type === 'shopConfig') {
        settings = item
      } else {
        products.push(item)
      }
    }

    if (!settings) {
      try {
        var cfg = await db.collection('products').doc(CONFIG_DOC_ID).get()
        if (cfg.data) settings = cfg.data
      } catch (e1) {}
    }
    if (!settings) {
      try {
        var old = await db.collection('settings').doc('shop').get()
        if (old.data) settings = old.data
      } catch (e2) {}
    }

    var categories = (settings && settings.categories) ? settings.categories : DEFAULT_CATEGORIES
    return { success: true, data: products, settings: settings, categories: categories }
  } catch (e) {
    return { success: false, data: [], settings: null, categories: DEFAULT_CATEGORIES, error: e.message }
  }
}
