// 订单详情页
var db = wx.cloud.database()

Page({
  data: {
    order: null,
    loading: true,
    themeColor: '#4A90D9'
  },

  onLoad: function (options) {
    var s = wx.getStorageSync('shopSettings')
    if (s && s.themeColor) this.setData({ themeColor: s.themeColor })
    if (options.id) this.loadOrder(options.id)
  },

  loadOrder: function (id) {
    var self = this
    db.collection('orders').doc(id).get().then(function (res) {
      var order = res.data
      order.statusText = self.getStatusText(order.status)
      order.createTimeText = self.formatTime(order.createTime)
      if (order.payTime) order.payTimeText = self.formatTime(order.payTime)
      if (order.deliveryTime) order.deliveryTimeText = self.formatTime(order.deliveryTime)
      if (order.completeTime) order.completeTimeText = self.formatTime(order.completeTime)
      self.setData({ order: order, loading: false })
    }).catch(function () {
      wx.showToast({ title: '订单不存在', icon: 'none' })
      setTimeout(function () { wx.navigateBack() }, 1500)
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
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes())
  },

  callShop: function () {
    wx.makePhoneCall({ phoneNumber: '13800138000' })
  },

  callPhone: function (e) {
    wx.makePhoneCall({ phoneNumber: e.currentTarget.dataset.phone })
  }
})
