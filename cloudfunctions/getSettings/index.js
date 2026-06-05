const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  try {
    var res = await db.collection('settings').doc('shop').get()
    return { success: true, data: res.data }
  } catch (e) {
    return { success: false, data: null, error: e.message }
  }
}
