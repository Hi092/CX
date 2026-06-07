// 商家后台首页 - 直接读配置，避免云函数延迟
var db = wx.cloud.database()
var CONFIG_DOC_ID = 'shop_config_v1'

Page({
  data: {
    shopName: '我的店铺',
    shopAvatar: '',
    shopStatus: '营业中',
    todayOrders: 0,
    todayIncome: '0.00',
    totalProducts: 0,
    pendingOrders: 0,
    themeColor: '#4A90D9',
    loading: false
  },

  onLoad: function () {
    this.loadFromCache()
    this.refreshData()
  },

  onShow: function () {
    this.loadFromCache()
    this.refreshData()
  },

  loadFromCache: function () {
    var cached = wx.getStorageSync('shopSettings')
    if (cached) {
      this.setData({
        shopName: cached.shopName || '我的店铺',
        shopAvatar: cached.shopAvatar || '',
        shopStatus: cached.shopStatus || '营业中',
        themeColor: cached.themeColor || '#4A90D9'
      })
    }
    var statsCache = wx.getStorageSync('dashboardStats')
    if (statsCache) {
      this.setData({
        todayOrders: statsCache.todayOrders || 0,
        todayIncome: statsCache.todayIncome || '0.00',
        totalProducts: statsCache.totalProducts || 0,
        pendingOrders: statsCache.pendingOrders || 0
      })
    }
  },

  refreshData: function () {
    this.loadShopInfo()
    this.loadStats()
  },

  applyShopInfo: function (data) {
    if (!data) return
    this.setData({
      shopName: data.shopName || '我的店铺',
      shopAvatar: data.shopAvatar || data.bannerUrl || '',
      shopStatus: data.shopStatus || '营业中',
      themeColor: data.themeColor || '#4A90D9'
    })
    var cached = wx.getStorageSync('shopSettings') || {}
    for (var k in data) cached[k] = data[k]
    wx.setStorageSync('shopSettings', cached)
  },

  loadShopInfo: function () {
    var self = this
    db.collection('products').doc(CONFIG_DOC_ID).get().then(function (res) {
      if (res.data) self.applyShopInfo(res.data)
    }).catch(function (err) {
      console.error('后台首页读取配置失败', err)
    })
  },

  loadStats: function () {
    var self = this
    var now = new Date()
    var y = now.getFullYear(), m = now.getMonth(), d = now.getDate()
    var todayStart = new Date(y, m, d).getTime()
    var todayEnd = new Date(y, m, d + 1).getTime()

    db.collection('products').count().then(function (res) {
      self.setData({ totalProducts: res.total })
    }).catch(function () {})

    db.collection('orders').limit(100).get().then(function (res) {
      var orders = res.data
      var income = 0, pending = 0, totalOrders = 0
      for (var i = 0; i < orders.length; i++) {
        var ct = orders[i].createTime
        var ctTime = 0
        if (ct && ct.$date) ctTime = new Date(ct.$date).getTime()
        else if (ct) ctTime = new Date(ct).getTime()
        if (ctTime < todayStart || ctTime >= todayEnd) continue
        totalOrders++
        var status = orders[i].status
        if (status === 'completed' || status === 'paid' || status === 'delivering') {
          income += (orders[i].finalPrice || orders[i].totalPrice || 0)
        }
        if (status === 'pending' || status === 'paid' || status === 'delivering') pending++
      }
      self.setData({
        todayOrders: totalOrders,
        todayIncome: income.toFixed(2),
        pendingOrders: pending
      })
      wx.setStorageSync('dashboardStats', {
        todayOrders: totalOrders,
        todayIncome: income.toFixed(2),
        totalProducts: self.data.totalProducts,
        pendingOrders: pending
      })
    }).catch(function (err) {
      console.error('loadStats失败', err)
    })
  },

  goPage: function (e) {
    wx.navigateTo({ url: e.currentTarget.dataset.url })
  },

  exitAdmin: function () {
    wx.showModal({
      title: '提示', content: '确定退出商家模式？',
      success: function (res) {
        if (res.confirm) {
          wx.removeStorageSync('isShopOwner')
          wx.navigateBack()
        }
      }
    })
  }
})
