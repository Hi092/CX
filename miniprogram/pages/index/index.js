// 首页 - 商品列表
const db = wx.cloud.database()

Page({
  data: {
    banners: [
      { image: '/images/banner1.png', link: '' },
      { image: '/images/banner2.png', link: '' }
    ],
    categories: [
      { id: 1, name: '饮料', icon: '🥤' },
      { id: 2, name: '零食', icon: '🍪' },
      { id: 3, name: '方便面', icon: '🍜' },
      { id: 4, name: '日用品', icon: '🧴' },
      { id: 5, name: '烟酒', icon: '🚬' },
      { id: 6, name: '文具', icon: '✏️' },
      { id: 7, name: '生鲜', icon: '🥬' },
      { id: 8, name: '更多', icon: '📱' }
    ],
    hotProducts: [],
    newProducts: [],
    loading: true
  },

  onLoad: function () {
    this.getProducts()
  },

  onShow: function () {
    // 更新购物车角标
    this.updateCartBadge()
  },

  // 获取商品列表
  getProducts: function () {
    db.collection('products')
      .where({ status: 'on' })
      .orderBy('sales', 'desc')
      .limit(10)
      .get()
      .then(res => {
        this.setData({
          hotProducts: res.data.slice(0, 4),
          newProducts: res.data.slice(4, 8),
          loading: false
        })
      })
      .catch(err => {
        console.error('获取商品失败', err)
        // 使用示例数据
        this.setData({
          hotProducts: [
            { _id: '1', name: '可口可乐 330ml', price: 3.5, image: '/images/product1.png', sales: 100 },
            { _id: '2', name: '奥利奥饼干 97g', price: 8.9, image: '/images/product2.png', sales: 80 },
            { _id: '3', name: '康师傅红烧牛肉面', price: 4.5, image: '/images/product3.png', sales: 60 },
            { _id: '4', name: '舒肤佳香皂 115g', price: 6.9, image: '/images/product4.png', sales: 50 }
          ],
          newProducts: [
            { _id: '5', name: '农夫山泉 550ml', price: 2.0, image: '/images/product5.png', sales: 90 },
            { _id: '6', name: '红牛 250ml', price: 6.0, image: '/images/product6.png', sales: 40 },
            { _id: '7', name: '蒙牛纯牛奶 250ml', price: 3.0, image: '/images/product7.png', sales: 70 },
            { _id: '8', name: '维达纸巾 3层', price: 5.9, image: '/images/product8.png', sales: 30 }
          ],
          loading: false
        })
      })
  },

  // 搜索
  onSearch: function () {
    wx.navigateTo({
      url: '/pages/category/category?focus=true'
    })
  },

  // 跳转分类
  goCategory: function (e) {
    const id = e.currentTarget.dataset.id
    wx.switchTab({
      url: '/pages/category/category'
    })
  },

  // 跳转商品详情
  goDetail: function (e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: '/pages/order/detail?id=' + id
    })
  },

  // 加入购物车
  addToCart: function (e) {
    const product = e.currentTarget.dataset.product
    let cart = wx.getStorageSync('cart') || []
    
    const index = cart.findIndex(item => item._id === product._id)
    if (index > -1) {
      cart[index].quantity++
    } else {
      cart.push({
        _id: product._id,
        name: product.name,
        price: product.price,
        image: product.image,
        quantity: 1
      })
    }
    
    wx.setStorageSync('cart', cart)
    this.updateCartBadge()
    
    wx.showToast({
      title: '已加入购物车',
      icon: 'success'
    })
  },

  // 更新购物车角标
  updateCartBadge: function () {
    const cart = wx.getStorageSync('cart') || []
    const count = cart.reduce((sum, item) => sum + item.quantity, 0)
    if (count > 0) {
      wx.setTabBarBadge({
        index: 2,
        text: count.toString()
      })
    } else {
      wx.removeTabBarBadge({
        index: 2
      })
    }
  }
})
