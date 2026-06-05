const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  try {
    var res = await db.collection('products').limit(100).get()
    return { success: true, data: res.data }
  } catch (e) {
    return { success: false, data: [], error: e.message }
  }
}
