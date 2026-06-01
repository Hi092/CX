// 首页 - 商品列表
var db = wx.cloud.database()

Page({
  data: {
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
    loading: true,
    themeColor: '#4A90D9'
  },

  onLoad: function () {
    var s = wx.getStorageSync('shopSettings')
    if (s && s.themeColor) this.setData({ themeColor: s.themeColor })
    this.getProducts()
  },

  onShow: function () {
    var s = wx.getStorageSync('shopSettings')
    if (s && s.themeColor) this.setData({ themeColor: s.themeColor })
    this.updateCartBadge()
  },

  getProducts: function () {
    var self = this
    db.collection('products').limit(10).get().then(function (res) {
      self.setData({
        hotProducts: res.data.slice(0, 4),
        newProducts: res.data.slice(4, 8),
        loading: false
      })
    }).catch(function (err) {
      console.error('获取商品失败', err)
      self.setData({
        hotProducts: [
          { _id: '1', name: '可口可乐 330ml', price: 3.5, sales: 100 },
          { _id: '2', name: '奥利奥饼干 97g', price: 8.9, sales: 80 },
          { _id: '3', name: '康师傅红烧牛肉面', price: 4.5, sales: 60 },
          { _id: '4', name: '舒肤佳香皂 115g', price: 6.9, sales: 50 }
        ],
        newProducts: [
          { _id: '5', name: '农夫山泉 550ml', price: 2.0, sales: 90 },
          { _id: '6', name: '红牛 250ml', price: 6.0, sales: 40 },
          { _id: '7', name: '蒙牛纯牛奶 250ml', price: 3.0, sales: 70 },
          { _id: '8', name: '维达纸巾 3层', price: 5.9, sales: 30 }
        ],
        loading: false
      })
    })
  },

  onSearch: function () {
    wx.navigateTo({ url: '/pages/category/category?focus=true' })
  },

  goCategory: function () {
    wx.switchTab({ url: '/pages/category/category' })
  },

  goDetail: function (e) {
    var id = e.currentTarget.dataset.id
    wx.navigateTo({ url: '/pages/order/detail?id=' + id })
  },

  addToCart: function (e) {
    var product = e.currentTarget.dataset.product
    var cart = wx.getStorageSync('cart') || []
    var idx = -1
    for (var i = 0; i < cart.length; i++) {
      if (cart[i]._id === product._id) { idx = i; break }
    }
    if (idx > -1) { cart[idx].quantity++ }
    else { cart.push({ _id: product._id, name: product.name, price: product.price, image: product.image, quantity: 1 }) }
    wx.setStorageSync('cart', cart)
    this.updateCartBadge()
    wx.showToast({ title: '已加入购物车', icon: 'success' })
  },

  updateCartBadge: function () {
    var cart = wx.getStorageSync('cart') || []
    var count = 0
    for (var i = 0; i < cart.length; i++) { count += cart[i].quantity }
    if (count > 0) { wx.setTabBarBadge({ index: 2, text: count.toString() }) }
    else { wx.removeTabBarBadge({ index: 2 }) }
  }
})
