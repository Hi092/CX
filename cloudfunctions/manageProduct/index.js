const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  try {
    const { action, id, data } = event
    
    if (action === 'delete') {
      await db.collection('products').doc(id).remove()
      return { success: true }
    }
    
    if (action === 'update') {
      await db.collection('products').doc(id).update({ data: data })
      return { success: true }
    }
    
    if (action === 'create') {
      const res = await db.collection('products').add({ data: data })
      return { success: true, id: res._id }
    }
    
    if (action === 'toggleStatus') {
      await db.collection('products').doc(id).update({ data: { status: data.status } })
      return { success: true }
    }
    
    if (action === 'saveSettings') {
      // 保存设置（分类等）
      try {
        await db.collection('settings').doc('shop').update({ data: data })
        return { success: true, action: 'update' }
      } catch (e) {
        // 如果文档不存在，创建它
        await db.collection('settings').doc('shop').set({ data: data })
        return { success: true, action: 'create' }
      }
    }
    
    return { success: false, error: 'Unknown action' }
  } catch (e) {
    return { success: false, error: e.message }
  }
}
