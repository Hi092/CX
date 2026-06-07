var db = wx.cloud.database()
var _ = db.command

Page({
  data: {
    orders: [],
    currentTab: 'paid',
    loading: true,
    stats: { todayOrders: 0, todayIncome: '0.00', activeCount: 0, paidCount: 0, deliveringCount: 0 },
    themeColor: '#4A90D9',
    badgeCounts: { all: 0, paid: 0, delivering: 0 }
  },

  onShow: function () {
    var s = wx.getStorageSync('shopSettings')
    if (s && s.themeColor) this.setData({ themeColor: s.themeColor })
    this.getOrders()
    this.getStats()
    this.getBadges()
  },

  switchTab: function (e) {
    this.setData({ currentTab: e.currentTarget.dataset.tab })
    this.getOrders()
  },

  getBadges: function () {
    var self = this
    var paidQ = db.collection('orders').where({ status: 'paid' }).count()
    var delivQ = db.collection('orders').where({ status: 'delivering' }).count()
    Promise.all([paidQ, delivQ]).then(function (res) {
      var p = res[0].total || 0
      var d = res[1].total || 0
      self.setData({ badgeCounts: { all: p + d, paid: p, delivering: d } })
    })
  },

  getOrders: function () {
    var self = this
    self.setData({ loading: true })
    var status = self.data.currentTab
    var query = db.collection('orders').orderBy('createTime', 'desc')
    if (status === 'all') {
      query = query.where({ status: _.in(['paid', 'delivering', 'completed']) })
    } else {
      query = query.where({ status: status })
    }
    query.limit(100).get().then(function (res) {
      var list = res.data || []
      console.log('商家订单 page=' + status, 'count=' + list.length, list.slice(0, 5))
      for (var i = 0; i < list.length; i++) {
        list[i].statusText = self.getStatusText(list[i].status)
        list[i].createTimeText = self.formatTime(list[i].createTime)
      }
      self.setData({ orders: list, loading: false })
    }).catch(function (err) {
      console.error('商家订单查询失败', err)
      self.setData({ orders: [], loading: false })
    })
  },

  getStats: function () {
    var self = this
    db.collection('orders').limit(200).orderBy('createTime', 'desc').get().then(function (res) {
      var orders = res.data || []
      var now = new Date()
      var y = now.getFullYear(), m = now.getMonth(), d = now.getDate()
      var todayOrders = 0, todayIncome = 0, activeCount = 0, paidCount = 0, deliveringCount = 0
      for (var i = 0; i < orders.length; i++) {
        var ct = self.toDate(orders[i].createTime)
        if (ct && ct.getFullYear() === y && ct.getMonth() === m && ct.getDate() === d) {
          todayOrders++
          todayIncome += (orders[i].finalPrice || orders[i].totalPrice || 0)
        }
        if (orders[i].status === 'paid' || orders[i].status === 'delivering') activeCount++
        if (orders[i].status === 'paid') paidCount++
        if (orders[i].status === 'delivering') deliveringCount++
      }
      self.setData({
        stats: {
          todayOrders: todayOrders,
          todayIncome: todayIncome.toFixed(2),
          activeCount: activeCount,
          paidCount: paidCount,
          deliveringCount: deliveringCount
        }
      })
    }).catch(function (err) {
      console.error('商家订单统计失败', err)
    })
  },

  startDelivery: function (e) {
    var self = this
    var orderId = e.currentTarget.dataset.id
    if (!orderId) return
    wx.showModal({
      title: '开始配送',
      content: '把这笔订单标记为配送中吗？',
      confirmText: '开始配送',
      success: function (res) {
        if (!res.confirm) return
        wx.showLoading({ title: '处理中...' })
        wx.cloud.callFunction({
          name: 'manageOrder',
          data: { action: 'updateStatus', id: orderId, status: 'delivering' },
          success: function (r) {
            wx.hideLoading()
            if (r.result && r.result.success) {
              wx.showToast({ title: '已开始配送', icon: 'success' })
              self.setData({ currentTab: 'delivering' })
              self.getOrders()
              self.getStats()
              self.getBadges()
            } else {
              console.error('开始配送云函数返回', r)
              wx.showToast({ title: '操作失败: ' + (r.result && r.result.error || '未知'), icon: 'none' })
            }
          },
          fail: function (err) {
            wx.hideLoading()
            console.error('开始配送云函数调用失败', err)
            wx.showToast({ title: '网络失败', icon: 'none' })
          }
        })
      }
    })
  },

  completeDelivery: function (e) {
    var self = this
    var orderId = e.currentTarget.dataset.id
    if (!orderId) return
    wx.showModal({
      title: '确认送达',
      content: '确认订单已送达吗？',
      confirmText: '确认送达',
      success: function (res) {
        if (!res.confirm) return
        wx.showLoading({ title: '处理中...' })
        wx.cloud.callFunction({
          name: 'manageOrder',
          data: { action: 'updateStatus', id: orderId, status: 'completed' },
          success: function (r) {
            wx.hideLoading()
            if (r.result && r.result.success) {
              wx.showToast({ title: '已完成', icon: 'success' })
              self.getOrders()
              self.getStats()
              self.getBadges()
            } else {
              console.error('确认送达云函数返回', r)
              wx.showToast({ title: '操作失败: ' + (r.result && r.result.error || '未知'), icon: 'none' })
            }
          },
          fail: function (err) {
            wx.hideLoading()
            console.error('确认送达云函数调用失败', err)
            wx.showToast({ title: '网络失败', icon: 'none' })
          }
        })
      }
    })
  },

  viewDetail: function (e) {
    wx.navigateTo({ url: '/pages/order/detail?id=' + e.currentTarget.dataset.id + '&admin=1' })
  },

  callPhone: function (e) {
    var phone = e.currentTarget.dataset.phone
    if (phone) wx.makePhoneCall({ phoneNumber: phone })
  },

  getStatusText: function (status) {
    var map = { 'pending': '待付款', 'paid': '待配送', 'delivering': '配送中', 'completed': '已完成' }
    return map[status] || status
  },

  formatTime: function (timestamp) {
    var d = this.toDate(timestamp)
    if (!d) return ''
    var pad = function (n) { return n < 10 ? '0' + n : '' + n }
    return pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes())
  },

  toDate: function (timestamp) {
    if (!timestamp) return null
    if (typeof timestamp === 'object' && timestamp.$date) return new Date(timestamp.$date)
    return new Date(timestamp)
  }
})
