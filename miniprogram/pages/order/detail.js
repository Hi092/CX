// 订单详情页
var db = wx.cloud.database()

Page({
  data: {
    order: null,
    loading: true,
    themeColor: '#4A90D9',
    shopPhone: '',
    isAdmin: false
  },

  onLoad: function (options) {
    var s = wx.getStorageSync('shopSettings')
    if (s) {
      if (s.themeColor) this.setData({ themeColor: s.themeColor })
      if (s.shopPhone) this.setData({ shopPhone: s.shopPhone })
    }
    this.setData({ isAdmin: options.admin === '1' })
    if (options.id) this.loadOrder(options.id)
  },

  loadOrder: function (id) {
    var self = this
    wx.cloud.callFunction({
      name: 'manageOrder',
      data: { action: 'get', id: id, admin: self.data.isAdmin },
      success: function (res) {
        if (res.result && res.result.success && res.result.data) self.applyOrder(res.result.data)
        else self.loadOrderDirect(id)
      },
      fail: function () { self.loadOrderDirect(id) }
    })
  },

  loadOrderDirect: function (id) {
    var self = this
    db.collection('orders').doc(id).get().then(function (res) {
      self.applyOrder(res.data)
    }).catch(function () {
      wx.showToast({ title: '订单不存在', icon: 'none' })
      setTimeout(function () { wx.navigateBack() }, 1500)
    })
  },

  applyOrder: function (order) {
    order.statusText = this.getStatusText(order.status)
    order.createTimeText = this.formatTime(order.createTime)
    if (order.payTime) order.payTimeText = this.formatTime(order.payTime)
    if (order.deliveryTime) order.deliveryTimeText = this.formatTime(order.deliveryTime)
    if (order.completeTime) order.completeTimeText = this.formatTime(order.completeTime)
    this.setData({ order: order, loading: false })
  },

  getStatusText: function (status) {
    var map = { 'pending': '待付款', 'paid': '待配送', 'delivering': '配送中', 'completed': '已完成' }
    return map[status] || status
  },

  formatTime: function (timestamp) {
    if (!timestamp) return ''
    var d = typeof timestamp === 'object' && timestamp.$date ? new Date(timestamp.$date) : new Date(timestamp)
    var pad = function (n) { return n < 10 ? '0' + n : '' + n }
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes())
  },

  callShop: function () {
    var phone = this.data.shopPhone
    if (!phone) {
      wx.showToast({ title: '暂无商家电话', icon: 'none' })
      return
    }
    wx.makePhoneCall({ phoneNumber: phone })
  },

  callPhone: function (e) { wx.makePhoneCall({ phoneNumber: e.currentTarget.dataset.phone }) }
})
