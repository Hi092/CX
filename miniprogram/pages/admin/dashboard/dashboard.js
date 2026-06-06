// 商家后台首页 - 优化加载速度
var db = wx.cloud.database()

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
    // 先从缓存加载，秒显示
    this.loadFromCache()
    // 后台刷新数据
    this.refreshData()
  },

  onShow: function () {
    // 先从缓存加载
    this.loadFromCache()
    // 后台刷新
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
    var self = this
    // 并行加载，不阻塞UI
    this.loadShopInfo()
    this.loadStats()
  },

  loadShopInfo: function () {
    var self = this
    db.collection('settings').doc('shop').get().then(function (res) {
      if (res.data) {
        var data = res.data
        self.setData({
          shopName: data.shopName || '我的店铺',
          shopAvatar: data.shopAvatar || data.bannerUrl || '',
          shopStatus: data.shopStatus || '营业中',
          themeColor: data.themeColor || '#4A90D9'
        })
        // 更新缓存
        var cached = wx.getStorageSync('shopSettings') || {}
        cached.shopName = data.shopName
        cached.shopAvatar = data.shopAvatar || data.bannerUrl
        cached.shopStatus = data.shopStatus
        cached.themeColor = data.themeColor
        wx.setStorageSync('shopSettings', cached)
      }
    }).catch(function () {})
  },

  loadStats: function () {
    var self = this
    var now = new Date()
    var y = now.getFullYear(), m = now.getMonth(), d = now.getDate()
    var todayStart = new Date(y, m, d).getTime()
    var todayEnd = new Date(y, m, d + 1).getTime()

    // 用云函数获取统计数据，更快
    wx.cloud.callFunction({
      name: 'getProducts',
      success: function (res) {
        if (res.result && res.result.data) {
          self.setData({ totalProducts: res.result.data.length })
        }
      },
      fail: function () {
        db.collection('products').count().then(function (res) {
          self.setData({ totalProducts: res.total })
        }).catch(function () {})
      }
    })

    // 读订单统计
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
      // 缓存统计数据
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
