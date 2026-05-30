// 商品管理页面
const db = wx.cloud.database()

Page({
  data: {
    products: [],
    loading: true,
    categories: ['饮料', '零食', '方便面', '日用品', '烟酒', '文具', '生鲜']
  },

  onLoad: function () {
    this.getProducts()
  },

  onShow: function () {
    this.getProducts()
  },

  // 获取商品列表
  getProducts: function () {
    this.setData({ loading: true })
    
    db.collection('products')
      .orderBy('createTime', 'desc')
      .limit(100)
      .get()
      .then(res => {
        const products = res.data.map(p => ({
          ...p,
          statusText: p.status === 'on' ? '在售' : '已下架',
          statusClass: p.status
        }))
        this.setData({ products, loading: false })
      })
      .catch(err => {
        console.error('获取商品失败', err)
        // 示例数据
        this.setData({
          products: [
            { _id: '1', name: '可口可乐 330ml', price: 3.5, stock: 48, category: '饮料', status: 'on', statusText: '在售', statusClass: 'on', image: '/images/product1.png' },
            { _id: '2', name: '奥利奥饼干 97g', price: 8.9, stock: 24, category: '零食', status: 'on', statusText: '在售', statusClass: 'on', image: '/images/product2.png' },
            { _id: '3', name: '康师傅红烧牛肉面', price: 4.5, stock: 36, category: '方便面', status: 'on', statusText: '在售', statusClass: 'on', image: '/images/product3.png' },
            { _id: '4', name: '舒肤佳香皂 115g', price: 6.9, stock: 15, category: '日用品', status: 'off', statusText: '已下架', statusClass: 'off', image: '/images/product4.png' }
          ],
          loading: false
        })
      })
  },

  // 添加商品
  addProduct: function () {
    wx.navigateTo({
      url: '/pages/admin/products/edit'
    })
  },

  // 编辑商品
  editProduct: function (e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: '/pages/admin/products/edit?id=' + id
    })
  },

  // 上架/下架
  toggleStatus: function (e) {
    const { id, status } = e.currentTarget.dataset
    const newStatus = status === 'on' ? 'off' : 'on'
    const actionText = newStatus === 'on' ? '上架' : '下架'
    
    wx.showModal({
      title: '提示',
      content: `确定要${actionText}这个商品吗？`,
      success: (res) => {
        if (res.confirm) {
          db.collection('products').doc(id).update({
            data: { status: newStatus }
          }).then(() => {
            wx.showToast({ title: `已${actionText}`, icon: 'success' })
            this.getProducts()
          })
        }
      }
    })
  },

  // 删除商品
  deleteProduct: function (e) {
    const id = e.currentTarget.dataset.id
    
    wx.showModal({
      title: '警告',
      content: '确定要删除这个商品吗？删除后无法恢复！',
      confirmColor: '#FF0000',
      success: (res) => {
        if (res.confirm) {
          db.collection('products').doc(id).remove().then(() => {
            wx.showToast({ title: '已删除', icon: 'success' })
            this.getProducts()
          })
        }
      }
    })
  }
})
