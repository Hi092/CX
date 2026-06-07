// 订单详情页
var db = wx.cloud.database()
var PENDING_EXPIRE_MS = 10 * 60 * 1000

Page({
  data: {
    order: null,
    loading: true,
    themeColor: '#4A90D9',
    shopPhone: '',
    isAdmin: false,
    paying: false,
    deleting: false
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
    order.pendingExpireText = this.getPendingExpireText(order)
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

  getPendingExpireText: function (order) {
    if (!order || order.status !== 'pending') return ''
    var createMs = getTimeMs(order.createTime)
    if (!createMs) return '10分钟后自动删除'
    var leftMs = createMs + PENDING_EXPIRE_MS - Date.now()
    if (leftMs <= 0) return '即将自动删除'
    var leftMin = Math.max(1, Math.ceil(leftMs / 60000))
    return leftMin + '分钟后自动删除'
  },

  isPendingExpired: function (order) {
    if (!order || order.status !== 'pending') return false
    var createMs = getTimeMs(order.createTime)
    if (!createMs) return false
    return Date.now() - createMs >= PENDING_EXPIRE_MS
  },

  payAgain: function () {
    var self = this
    var order = this.data.order
    if (!order || order.status !== 'pending' || this.data.paying) return
    if (this.isPendingExpired(order)) {
      wx.showToast({ title: '订单已超时删除', icon: 'none' })
      this.deleteOrderById(order._id, false, function () { wx.navigateBack() })
      return
    }
    wx.showModal({
      title: '模拟支付',
      content: '订单金额: ¥' + (order.finalPrice || order.totalPrice || '0.00'),
      confirmText: '立即支付',
      cancelText: '取消',
      success: function (res) {
        if (res.confirm) self.payOrderCloud(order._id)
      }
    })
  },

  payOrderCloud: function (id) {
    var self = this
    self.setData({ paying: true })
    wx.cloud.callFunction({
      name: 'manageOrder',
      data: { action: 'pay', id: id },
      success: function (res) {
        if (res.result && res.result.success) self.onPaySuccess()
        else if (res.result && res.result.error === 'ORDER_EXPIRED') {
          wx.showToast({ title: '订单已超时删除', icon: 'none' })
          self.setData({ paying: false })
          wx.navigateBack()
        } else self.payOrderDirect(id)
      },
      fail: function () { self.payOrderDirect(id) }
    })
  },

  payOrderDirect: function (id) {
    var self = this
    db.collection('orders').doc(id).update({ data: { status: 'paid', payTime: new Date() } }).then(function () {
      self.onPaySuccess()
    }).catch(function () {
      wx.showToast({ title: '支付失败', icon: 'none' })
      self.setData({ paying: false })
    })
  },

  onPaySuccess: function () {
    wx.showToast({ title: '支付成功', icon: 'success' })
    this.setData({ paying: false })
    this.loadOrder(this.data.order._id)
  },

  deletePendingOrder: function () {
    var self = this
    var order = this.data.order
    if (!order || order.status !== 'pending') return
    wx.showModal({
      title: '删除订单', content: '确定删除这个未付款订单吗？', confirmText: '删除', confirmColor: '#e74c3c',
      success: function (res) {
        if (res.confirm) self.deleteOrderById(order._id, true, function () { wx.navigateBack() })
      }
    })
  },

  deleteOrderById: function (id, showToast, done) {
    var self = this
    self.setData({ deleting: true })
    wx.cloud.callFunction({
      name: 'manageOrder',
      data: { action: 'delete', id: id },
      success: function (res) {
        if (res.result && res.result.success) self.afterDelete(showToast, done)
        else self.deleteOrderDirect(id, showToast, done)
      },
      fail: function () { self.deleteOrderDirect(id, showToast, done) }
    })
  },

  deleteOrderDirect: function (id, showToast, done) {
    var self = this
    db.collection('orders').doc(id).remove().then(function () {
      self.afterDelete(showToast, done)
    }).catch(function () {
      if (showToast) wx.showToast({ title: '删除失败', icon: 'none' })
      self.setData({ deleting: false })
    })
  },

  afterDelete: function (showToast, done) {
    if (showToast) wx.showToast({ title: '已删除', icon: 'success' })
    this.setData({ deleting: false })
    if (done) setTimeout(done, 500)
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

function getTimeMs(timestamp) {
  if (!timestamp) return 0
  if (typeof timestamp === 'number') return timestamp
  if (typeof timestamp === 'object' && timestamp.getTime) return timestamp.getTime()
  if (typeof timestamp === 'object' && timestamp.$date) return new Date(timestamp.$date).getTime()
  var t = new Date(timestamp).getTime()
  return isNaN(t) ? 0 : t
}
