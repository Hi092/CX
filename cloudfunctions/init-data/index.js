const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const products = [
    { name: '可口可乐 330ml', price: 3.5, stock: 48, category: '饮料', description: '经典口味，清爽解渴', status: 'on', sales: 100 },
    { name: '农夫山泉 550ml', price: 2.0, stock: 60, category: '饮料', description: '天然矿泉水', status: 'on', sales: 90 },
    { name: '红牛 250ml', price: 6.0, stock: 30, category: '饮料', description: '提神抗疲劳', status: 'on', sales: 40 },
    { name: '蒙牛纯牛奶 250ml', price: 3.0, stock: 40, category: '饮料', description: '新鲜营养', status: 'on', sales: 70 },
    { name: '元气森林气泡水', price: 5.0, stock: 36, category: '饮料', description: '0糖0脂0卡', status: 'on', sales: 55 },
    { name: '奥利奥饼干 97g', price: 8.9, stock: 24, category: '零食', description: '扭一扭舔一舔泡一泡', status: 'on', sales: 80 },
    { name: '乐事薯片 75g', price: 7.5, stock: 30, category: '零食', description: '好吃到停不下来', status: 'on', sales: 65 },
    { name: '德芙巧克力 43g', price: 6.5, stock: 20, category: '零食', description: '纵享丝滑', status: 'on', sales: 45 },
    { name: '辣条大礼包', price: 9.9, stock: 15, category: '零食', description: '童年的味道', status: 'on', sales: 35 },
    { name: '康师傅红烧牛肉面', price: 4.5, stock: 36, category: '方便面', description: '就是这个味儿', status: 'on', sales: 60 },
    { name: '统一老坛酸菜面', price: 4.5, stock: 30, category: '方便面', description: '这酸爽不敢相信', status: 'on', sales: 50 },
    { name: '舒肤佳香皂 115g', price: 6.9, stock: 15, category: '日用品', description: '长效抑菌', status: 'on', sales: 30 },
    { name: '维达纸巾 3层', price: 5.9, stock: 40, category: '日用品', description: '柔软亲肤', status: 'on', sales: 50 },
    { name: '南孚电池 5号 4粒', price: 9.9, stock: 20, category: '日用品', description: '一节更比六节强', status: 'on', sales: 20 }
  ]
  try {
    for (const p of products) {
      await db.collection('products').add({ data: { ...p, image: '', createTime: db.serverDate(), updateTime: db.serverDate() } })
    }
    return { success: true, count: products.length }
  } catch (err) {
    return { success: false, error: err.message }
  }
}
