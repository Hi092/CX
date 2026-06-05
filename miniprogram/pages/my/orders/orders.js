// 我的订单
var db = wx.cloud.database()

Page({
  data: {
    orders: [],
    currentTab: 'all',
    loading: true,
    themeColor: '#4A90D9'
  },

  onLoad: function (options) {
    var s = wx.getStorageSync('shopSettings')
    if (s && s.themeColor) this.setData({ themeColor: s.themeColor })
    if (options.status) this.setData({ currentTab: options.status })
    this.getOrders()
  },

  onShow: function () {
    var s = wx.getStorageSync('shopSettings')
    if (s && s.themeColor) this.setData({ themeColor: s.themeColor })
    this.getOrders()
  },

  switchTab: function (e) {
    this.setData({ currentTab: e.currentTarget.dataset.tab })
    this.getOrders()
  },

  getOrders: function () {
    var self = this
    self.setData({ loading: true })
    var cond = { _openid: '{openid}' }
    if (self.data.currentTab !== 'all') cond.status = self.data.currentTab
    db.collection('orders').where(cond).orderBy('createTime', 'desc').limit(50).get().then(function (res) {
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

  viewDetail: function (e) {
    var id = e.currentTarget.dataset.id
    wx.navigateTo({ url: '/pages/order/detail?id=' + id })
  }
})
