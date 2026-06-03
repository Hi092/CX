// 商家后台首页
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
    themeColor: '#4A90D9'
  },

  onLoad: function () {
    this.loadTheme()
    this.loadShopInfo()
    this.loadStats()
  },

  onShow: function () {
    this.loadTheme()
    this.loadShopInfo()
    this.loadStats()
  },

  loadTheme: function () {
    var s = wx.getStorageSync('shopSettings')
    if (s && s.themeColor) {
      this.setData({ themeColor: s.themeColor })
      return
    }
    var self = this
    db.collection('settings').doc('shop').get().then(function (res) {
      if (res.data && res.data.themeColor) {
        self.setData({ themeColor: res.data.themeColor })
      }
    }).catch(function () {})
  },

  loadShopInfo: function () {
    var self = this
    // 先读缓存
    var cached = wx.getStorageSync('shopSettings')
    if (cached) {
      self.setData({
        shopName: cached.shopName || '我的店铺',
        shopAvatar: cached.shopAvatar || '',
        shopStatus: cached.shopStatus || '营业中'
      })
    }
    // 再读数据库
    db.collection('settings').doc('shop').get().then(function (res) {
      if (res.data) {
        self.setData({
          shopName: res.data.shopName || '我的店铺',
          shopAvatar: res.data.shopAvatar || res.data.bannerUrl || '',
          shopStatus: res.data.shopStatus || '营业中'
        })
      }
    }).catch(function () {})
  },

  loadStats: function () {
    var self = this
    var today = new Date()
    today.setHours(0, 0, 0, 0)

    db.collection('orders')
      .where({ createTime: db.command.gte(today.getTime()) })
      .get()
      .then(function (res) {
        var orders = res.data
        var income = 0
        var pending = 0
        var totalOrders = orders.length
        for (var i = 0; i < orders.length; i++) {
          var status = orders[i].status
          // 今日收入：统计已支付+配送中+已完成的订单
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
      }).catch(function (err) {
        console.error('loadStats失败', err)
        self.setData({ todayOrders: 0, todayIncome: '0.00', pendingOrders: 0 })
      })

    db.collection('products')
      .count()
      .then(function (res) {
        self.setData({ totalProducts: res.total })
      }).catch(function () {})
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
