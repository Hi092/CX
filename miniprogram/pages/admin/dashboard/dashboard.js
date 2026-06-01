// 商家后台首页
var db = wx.cloud.database()

Page({
  data: {
    shopName: '我的店铺',
    todayOrders: 0,
    todayIncome: 0,
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
    db.collection('settings').doc('shop').get().then(function (res) {
      if (res.data && res.data.shopName) {
        self.setData({ shopName: res.data.shopName })
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
        for (var i = 0; i < orders.length; i++) {
          income += (orders[i].finalPrice || orders[i].totalPrice || 0)
          if (orders[i].status === 'pending' || orders[i].status === 'delivering') pending++
        }
        self.setData({
          todayOrders: orders.length,
          todayIncome: income.toFixed(2),
          pendingOrders: pending
        })
      })

    db.collection('products')
      .count()
      .then(function (res) {
        self.setData({ totalProducts: res.total })
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
