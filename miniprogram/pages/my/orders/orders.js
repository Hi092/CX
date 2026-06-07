// 我的订单 - 支持待付款重新支付、左滑删除、10分钟自动清理
var db = wx.cloud.database()
var _ = db.command
var PENDING_EXPIRE_MS = 10 * 60 * 1000
var SWIPE_DELETE_WIDTH = 150

Page({
  data: {
    orders: [],
    currentTab: 'all',
    loading: true,
    themeColor: '#4A90D9',
    openid: '',
    payingId: '',
    deletingId: '',
    activeSwipeId: '',
    touchStartX: 0,
    touchStartY: 0
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
    this.startPendingTimer()
  },

  onHide: function () { this.stopPendingTimer() },
  onUnload: function () { this.stopPendingTimer() },

  startPendingTimer: function () {
    var self = this
    this.stopPendingTimer()
    this.pendingTimer = setInterval(function () {
      self.refreshPendingCountdown()
    }, 60000)
  },

  stopPendingTimer: function () {
    if (this.pendingTimer) {
      clearInterval(this.pendingTimer)
      this.pendingTimer = null
    }
  },

  refreshPendingCountdown: function () {
    var list = this.filterExpiredPending(this.data.orders || [])
    this.applyOrders(list)
  },

  switchTab: function (e) {
    this.setData({ currentTab: e.currentTarget.dataset.tab, activeSwipeId: '' })
    this.getOrders()
  },

  getOrders: function () {
    var self = this
    self.setData({ loading: true })
    var openid = self.data.openid
    if (!openid) {
      wx.cloud.callFunction({
        name: 'manageOrder',
        data: { action: 'getOpenid' },
        success: function (res) {
          var id = res.result && res.result.openid
          if (!id) {
            console.warn('订单页拿不到openid', res)
            self.setData({ orders: [], loading: false })
            return
          }
          self.setData({ openid: id })
          self.fetchOrders(id)
        },
        fail: function (err) {
          console.error('订单页获取openid失败', err)
          self.setData({ orders: [], loading: false })
        }
      })
    } else {
      self.fetchOrders(openid)
    }
  },

  fetchOrders: function (openid) {
    var self = this
    var status = self.data.currentTab
    var q1Where = { customerOpenid: openid }
    var q2Where = { _openid: openid }
    if (status && status !== 'all') {
      q1Where.status = status
      q2Where.status = status
    }

    var q1 = db.collection('orders').where(q1Where).orderBy('createTime', 'desc').limit(100).get()
    var q2 = db.collection('orders').where(q2Where).orderBy('createTime', 'desc').limit(100).get()

    Promise.all([q1, q2]).then(function (res) {
      var list1 = res[0].data || []
      var list2 = res[1].data || []
      var merged = self.mergeOrders([list1, list2], status)
      merged = self.filterExpiredPending(merged)
      self.applyOrders(merged)
    }).catch(function (err) {
      console.error('我的订单查询失败:', err)
      self.setData({ orders: [], loading: false })
    })
  },

  mergeOrders: function (lists, status) {
    var seen = {}
    var out = []
    for (var i = 0; i < lists.length; i++) {
      var arr = lists[i] || []
      for (var j = 0; j < arr.length; j++) {
        var item = arr[j]
        if (seen[item._id]) continue
        if (status && status !== 'all' && item.status !== status) continue
        seen[item._id] = true
        out.push(item)
      }
    }
    out.sort(function (a, b) {
      return getTimeMs(b.createTime) - getTimeMs(a.createTime)
    })
    return out
  },

  filterExpiredPending: function (orders) {
    var keep = []
    var expiredIds = []
    for (var i = 0; i < orders.length; i++) {
      var item = orders[i]
      if (item.status === 'pending' && this.isPendingExpired(item)) expiredIds.push(item._id)
      else keep.push(item)
    }
    if (expiredIds.length > 0) this.deleteExpiredOrders(expiredIds)
    return keep
  },

  deleteExpiredOrders: function (ids) {
    for (var i = 0; i < ids.length; i++) this.deleteOrderById(ids[i], false)
  },

  applyOrders: function (orders) {
    for (var i = 0; i < orders.length; i++) {
      orders[i].statusText = this.getStatusText(orders[i].status)
      orders[i].createTimeText = this.formatTime(orders[i].createTime)
      orders[i].pendingExpireText = this.getPendingExpireText(orders[i])
      orders[i].swiped = this.data.activeSwipeId === orders[i]._id
    }
    this.setData({ orders: orders, loading: false })
  },

  getStatusText: function (status) {
    var map = { 'pending': '待付款', 'paid': '待配送', 'delivering': '配送中', 'completed': '已完成' }
    return map[status] || status
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

  formatTime: function (timestamp) {
    if (!timestamp) return ''
    var d = typeof timestamp === 'object' && timestamp.$date ? new Date(timestamp.$date) : new Date(timestamp)
    var pad = function (n) { return n < 10 ? '0' + n : '' + n }
    return pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes())
  },

  findOrder: function (id) {
    var list = this.data.orders || []
    for (var i = 0; i < list.length; i++) {
      if (list[i]._id === id) return list[i]
    }
    return null
  },

  viewDetail: function (e) {
    var id = e.currentTarget.dataset.id
    var status = e.currentTarget.dataset.status
    if (this.data.activeSwipeId) {
      this.closeSwipe()
      return
    }
    if (status === 'pending') {
      this.payAgainById(id)
      return
    }
    wx.navigateTo({ url: '/pages/order/detail?id=' + id })
  },

  viewDetailOnly: function (e) {
    wx.navigateTo({ url: '/pages/order/detail?id=' + e.currentTarget.dataset.id })
  },

  payAgain: function (e) {
    this.payAgainById(e.currentTarget.dataset.id)
  },

  payAgainById: function (id) {
    var self = this
    if (self.data.payingId) return
    var order = self.findOrder(id)
    if (!order) return
    if (self.isPendingExpired(order)) {
      wx.showToast({ title: '订单已超时删除', icon: 'none' })
      self.deleteOrderById(id, false, function () { self.getOrders() })
      return
    }
    self.closeSwipe()
    wx.showModal({
      title: '模拟支付',
      content: '订单金额: ¥' + (order.finalPrice || order.totalPrice || '0.00'),
      confirmText: '立即支付',
      cancelText: '取消',
      success: function (res) {
        if (res.confirm) self.payOrderCloud(id, order)
      }
    })
  },

  payOrderCloud: function (id, order) {
    var self = this
    self.setData({ payingId: id })
    wx.cloud.callFunction({
      name: 'manageOrder',
      data: { action: 'pay', id: id },
      success: function (res) {
        if (res.result && res.result.success) {
          self.onPaySuccess(order)
        } else if (res.result && res.result.error === 'ORDER_EXPIRED') {
          wx.showToast({ title: '订单已超时删除', icon: 'none' })
          self.setData({ payingId: '' })
          self.getOrders()
        } else {
          console.warn('重新支付云函数失败，走直连', res)
          self.payOrderDirect(id, order)
        }
      },
      fail: function (err) {
        console.error('重新支付云函数请求失败，走直连', err)
        self.payOrderDirect(id, order)
      }
    })
  },

  payOrderDirect: function (id, order) {
    var self = this
    db.collection('orders').doc(id).update({
      data: { status: 'paid', payTime: new Date() }
    }).then(function () {
      self.onPaySuccess(order)
    }).catch(function (err) {
      console.error('重新支付直连失败', err)
      wx.showToast({ title: '支付失败', icon: 'none' })
      self.setData({ payingId: '' })
    })
  },

  onPaySuccess: function (order) {
    this.cleanCartAfterPay(order)
    wx.showToast({ title: '支付成功', icon: 'success' })
    this.setData({ payingId: '', activeSwipeId: '' })
    this.getOrders()
  },

  cleanCartAfterPay: function (order) {
    if (!order || !order.items) return
    var paidIds = {}
    for (var i = 0; i < order.items.length; i++) paidIds[order.items[i].productId] = true
    var cart = wx.getStorageSync('cart') || []
    var next = []
    for (var j = 0; j < cart.length; j++) {
      if (!paidIds[cart[j]._id]) next.push(cart[j])
    }
    wx.setStorageSync('cart', next)
  },

  deletePendingOrder: function (e) {
    var id = e.currentTarget.dataset.id
    var self = this
    wx.showModal({
      title: '删除订单',
      content: '确定删除这个未付款订单吗？',
      confirmText: '删除',
      confirmColor: '#e74c3c',
      success: function (res) {
        if (res.confirm) self.deleteOrderById(id, true, function () { self.getOrders() })
      }
    })
  },

  deleteOrderById: function (id, showToast, done) {
    var self = this
    if (!id) return
    self.setData({ deletingId: id })
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
    }).catch(function (err) {
      console.error('删除订单失败', err)
      if (showToast) wx.showToast({ title: '删除失败', icon: 'none' })
      self.setData({ deletingId: '', activeSwipeId: '' })
    })
  },

  afterDelete: function (showToast, done) {
    if (showToast) wx.showToast({ title: '已删除', icon: 'success' })
    this.setData({ deletingId: '', activeSwipeId: '' })
    if (done) done()
  },

  onCardTouchStart: function (e) {
    var touch = e.touches && e.touches[0]
    if (!touch) return
    this.setData({ touchStartX: touch.clientX, touchStartY: touch.clientY })
  },

  onCardTouchEnd: function (e) {
    var touch = e.changedTouches && e.changedTouches[0]
    if (!touch) return
    var dx = touch.clientX - this.data.touchStartX
    var dy = touch.clientY - this.data.touchStartY
    var id = e.currentTarget.dataset.id
    var status = e.currentTarget.dataset.status
    if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy)) return
    if (status !== 'pending') return
    if (dx < 0) this.setData({ activeSwipeId: id })
    else this.closeSwipe()
    this.applyOrders(this.data.orders)
  },

  closeSwipe: function () {
    if (this.data.activeSwipeId) {
      this.setData({ activeSwipeId: '' })
      this.applyOrders(this.data.orders)
    }
  }
})

function getTimeMs(timestamp) {
  if (!timestamp) return 0
  if (typeof timestamp === 'number') return timestamp
  if (typeof timestamp === 'object' && timestamp.getTime) return timestamp.getTime()
  if (typeof timestamp === 'object' && timestamp.$date) return new Date(timestamp.$date).getTime()
  var t = new Date(timestamp).getTime()
  return isNaN(t) ? 0 : t
}
