// 商家订单管理
var db = wx.cloud.database()

Page({
  data: {
    orders: [],
    currentTab: 'all',
    loading: true,
    stats: { todayOrders: 0, todayIncome: '0.00' },
    themeColor: '#4A90D9'
  },

  onLoad: function () {
    var s = wx.getStorageSync('shopSettings')
    if (s && s.themeColor) this.setData({ themeColor: s.themeColor })
    this.getOrders()
    this.getStats()
  },

  onShow: function () {
    var s = wx.getStorageSync('shopSettings')
    if (s && s.themeColor) this.setData({ themeColor: s.themeColor })
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
      if (self.data.currentTab === 'pending') {
        query = query.where({ status: db.command.in(['pending', 'paid']) })
      } else {
        query = query.where({ status: self.data.currentTab })
      }
    }
    query.limit(50).get().then(function (res) {
      var orders = res.data
      for (var i = 0; i < orders.length; i++) {
        orders[i].statusText = self.getStatusText(orders[i].status)
        orders[i].createTimeText = self.formatTime(orders[i].createTime)
      }
      self.setData({ orders: orders, loading: false })
    }).catch(function (err) {
      console.error('getOrders失败', err)
      self.setData({ orders: [], loading: false })
    })
  },

  getStats: function () {
    var self = this
    db.collection('orders').limit(100).get().then(function (res) {
      var orders = res.data
      var now = new Date()
      var y = now.getFullYear(), m = now.getMonth(), d = now.getDate()
      var income = 0, todayCount = 0
      for (var i = 0; i < orders.length; i++) {
        var ct = orders[i].createTime
        var ctDate = null
        if (ct && ct.$date) ctDate = new Date(ct.$date)
        else if (ct) ctDate = new Date(ct)
        if (!ctDate) continue
        if (ctDate.getFullYear() !== y || ctDate.getMonth() !== m || ctDate.getDate() !== d) continue
        todayCount++
        var st = orders[i].status
        if (st === 'completed' || st === 'paid' || st === 'delivering') {
          income += (orders[i].finalPrice || orders[i].totalPrice || 0)
        }
      }
      console.log('getStats结果:', todayCount, income.toFixed(2))
      self.setData({ stats: { todayOrders: todayCount, todayIncome: income.toFixed(2) } })
    }).catch(function (err) {
      console.error('getStats失败', err)
      self.setData({ stats: { todayOrders: 0, todayIncome: '0.00' } })
    })
  },

  refreshStats: function () {
    var self = this
    // 先清零让UI有变化反馈，再延迟拉真实数据
    self.setData({ stats: { todayOrders: 0, todayIncome: '0.00' } })
    setTimeout(function () {
      self.getStats()
    }, 1000)
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
            self.refreshStats()
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
            self.refreshStats()
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
