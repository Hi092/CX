// 云函数：更新店铺设置（管理端调用）
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const data = event.data || {}

  try {
    // 先尝试更新
    await db.collection('settings').doc('shop').update({ data: data })
    return { success: true, action: 'update' }
  } catch (e) {
    // doc不存在，创建
    await db.collection('settings').doc('shop').set({ data: data })
    return { success: true, action: 'create' }
  }
}
