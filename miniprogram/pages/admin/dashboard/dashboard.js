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
    loading: false,
    yesterdayIncome: '0.00',
    weekIncome: '0.00',
    monthIncome: '0.00',
    yearIncome: '0.00'
  },

  onLoad: function () {
    this.loadFromCache()
    this.refreshData()
  },

  onShow: function () {
    this.loadFromCache()
    this.refreshData()
    this.startAutoRefresh()
  },

  onHide: function () { this.stopAutoRefresh() },
  onUnload: function () { this.stopAutoRefresh() },

  startAutoRefresh: function () {
    var self = this
    this.stopAutoRefresh()
    this.dashboardTimer = setInterval(function () {
      self.refreshData()
    }, 15000)
  },

  stopAutoRefresh: function () {
    if (this.dashboardTimer) {
      clearInterval(this.dashboardTimer)
      this.dashboardTimer = null
    }
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
    var yesterdayStart = new Date(y, m, d - 1).getTime()
    var yesterdayEnd = todayStart

    // 本周一0点
    var dayOfWeek = now.getDay() || 7
    var weekStart = new Date(y, m, d - dayOfWeek + 1).getTime()
    // 本月1号0点
    var monthStart = new Date(y, m, 1).getTime()
    // 今年1月1号0点
    var yearStart = new Date(y, 0, 1).getTime()

    db.collection('products').count().then(function (res) {
      self.setData({ totalProducts: res.total })
    }).catch(function () {})

    // 查最近500单，覆盖到一年
    db.collection('orders').orderBy('createTime', 'desc').limit(500).get().then(function (res) {
      var orders = res.data
      var todayInc = 0, yesterdayInc = 0, weekInc = 0, monthInc = 0, yearInc = 0
      var pending = 0, totalOrders = 0

      for (var i = 0; i < orders.length; i++) {
        var ct = orders[i].createTime
        var ctTime = 0
        if (ct && ct.$date) ctTime = new Date(ct.$date).getTime()
        else if (ct) ctTime = new Date(ct).getTime()
        var status = orders[i].status
        var hasIncome = (status === 'completed' || status === 'paid' || status === 'delivering')
        var price = orders[i].finalPrice || orders[i].totalPrice || 0

        if (status === 'paid') pending++

        if (!hasIncome || ctTime <= 0) continue

        if (ctTime >= todayStart && ctTime < todayEnd) {
          totalOrders++
          todayInc += price
        }
        if (ctTime >= yesterdayStart && ctTime < yesterdayEnd) yesterdayInc += price
        if (ctTime >= weekStart) weekInc += price
        if (ctTime >= monthStart) monthInc += price
        if (ctTime >= yearStart) yearInc += price
      }

      self.setData({
        todayOrders: totalOrders,
        todayIncome: todayInc.toFixed(2),
        pendingOrders: pending,
        yesterdayIncome: yesterdayInc.toFixed(2),
        weekIncome: weekInc.toFixed(2),
        monthIncome: monthInc.toFixed(2),
        yearIncome: yearInc.toFixed(2)
      })
      wx.setStorageSync('dashboardStats', {
        todayOrders: totalOrders,
        todayIncome: todayInc.toFixed(2),
        totalProducts: self.data.totalProducts,
        pendingOrders: pending,
        yesterdayIncome: yesterdayInc.toFixed(2),
        weekIncome: weekInc.toFixed(2),
        monthIncome: monthInc.toFixed(2),
        yearIncome: yearInc.toFixed(2)
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
