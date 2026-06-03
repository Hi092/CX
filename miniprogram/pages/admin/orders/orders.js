// 商家订单管理
var db = wx.cloud.database()

Page({
  data: {
    orders: [],
    currentTab: 'all',
    loading: true,
    stats: { todayOrders: 0, todayIncome: '0.00' },
    themeColor: '#4A90D9',
    shopPhone: ''
  },

  onLoad: function () {
    var s = wx.getStorageSync('shopSettings')
    if (s) {
      if (s.themeColor) this.setData({ themeColor: s.themeColor })
      if (s.shopPhone) this.setData({ shopPhone: s.shopPhone })
    }
    this.getOrders()
    this.getStats()
  },

  onShow: function () {
    var s = wx.getStorageSync('shopSettings')
    if (s) {
      if (s.themeColor) this.setData({ themeColor: s.themeColor })
      if (s.shopPhone) this.setData({ shopPhone: s.shopPhone })
    }
    this.getOrders()
    this.getStats()
  },

  switchTab: function (e) {
    this.setData({ currentTab: e.currentTarget.dataset.tab })
    this.getOrders()
  },

  getOrders: function () {
    var self = this
    self.setData({ loading: true })
    var query = db.collection('orders').orderBy('createTime', 'desc')
    if (self.data.currentTab !== 'all') {
      query = query.where({ status: self.data.currentTab })
    }
    query.limit(50).get().then(function (res) {
      var orders = res.data
      for (var i = 0; i < orders.length; i++) {
        orders[i].statusText = self.getStatusText(orders[i].status)
        orders[i].createTimeText = self.formatTime(orders[i].createTime)
      }
      self.setData({ orders: orders, loading: false })
    }).catch(function () {
      self.setData({ orders: [], loading: false })
    })
  },

  getStats: function () {
    var self = this
    var today = new Date()
    today.setHours(0, 0, 0, 0)
    db.collection('orders').where({ createTime: db.command.gte(today.getTime()) }).get().then(function (res) {
      var orders = res.data
      var income = 0
      // 今日收入：只统计已完成订单的实付金额
      for (var i = 0; i < orders.length; i++) {
        if (orders[i].status === 'completed') {
          income += (orders[i].finalPrice || orders[i].totalPrice || 0)
        }
      }
      self.setData({ stats: { todayOrders: orders.length, todayIncome: income.toFixed(2) } })
    }).catch(function () {
      self.setData({ stats: { todayOrders: 0, todayIncome: '0.00' } })
    })
  },

  getStatusText: function (status) {
    var map = { 'pending': '待配送', 'paid': '待配送', 'delivering': '配送中', 'completed': '已完成' }
    return map[status] || status
  },

  formatTime: function (timestamp) {
    if (!timestamp) return ''
    var d = typeof timestamp === 'object' && timestamp.$date ? new Date(timestamp.$date) : new Date(timestamp)
    var pad = function (n) { return n < 10 ? '0' + n : '' + n }
    return pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes())
  },

  startDelivery: function (e) {
    var orderId = e.currentTarget.dataset.id
    var self = this
    wx.showModal({
      title: '确认配送', content: '确认开始配送这个订单吗？',
      success: function (res) {
        if (res.confirm) {
          db.collection('orders').doc(orderId).update({ data: { status: 'delivering', deliveryTime: db.serverDate() } }).then(function () {
            wx.showToast({ title: '已开始配送', icon: 'success' })
            self.getOrders()
            self.getStats()
          })
        }
      }
    })
  },

  completeDelivery: function (e) {
    var orderId = e.currentTarget.dataset.id
    var self = this
    wx.showModal({
      title: '确认送达', content: '确认订单已送达吗？',
      success: function (res) {
        if (res.confirm) {
          db.collection('orders').doc(orderId).update({ data: { status: 'completed', completeTime: db.serverDate() } }).then(function () {
            wx.showToast({ title: '已完成', icon: 'success' })
            self.getOrders()
            self.getStats()
          })
        }
      }
    })
  },

  callPhone: function (e) {
    wx.makePhoneCall({ phoneNumber: e.currentTarget.dataset.phone })
  },

  viewDetail: function (e) {
    wx.navigateTo({ url: '/pages/order/detail?id=' + e.currentTarget.dataset.id })
  }
})
