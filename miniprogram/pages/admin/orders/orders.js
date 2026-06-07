// 商家订单管理 - 只显示已付款后的订单，红气泡按订单数提醒
var db = wx.cloud.database()
var _ = db.command
var ADMIN_VISIBLE_STATUS = ['paid', 'delivering', 'completed']
var ADMIN_REMIND_STATUS = ['paid', 'delivering']

Page({
  data: {
    orders: [],
    currentTab: 'all',
    loading: true,
    stats: { todayOrders: 0, todayIncome: '0.00' },
    badgeCounts: { all: 0, paid: 0, delivering: 0 },
    themeColor: '#4A90D9'
  },

  onLoad: function () {
    this.loadTheme()
    this.refreshData(true)
  },

  onShow: function () {
    this.loadTheme()
    this.refreshData(true)
    this.startAutoRefresh()
  },

  onHide: function () { this.stopAutoRefresh() },
  onUnload: function () { this.stopAutoRefresh() },

  startAutoRefresh: function () {
    var self = this
    this.stopAutoRefresh()
    this.adminRefreshTimer = setInterval(function () {
      self.refreshData(false)
    }, 15000)
  },

  stopAutoRefresh: function () {
    if (this.adminRefreshTimer) {
      clearInterval(this.adminRefreshTimer)
      this.adminRefreshTimer = null
    }
  },

  refreshData: function (showLoading) {
    this.getOrders(showLoading)
    this.getStats()
    this.loadAdminBadges()
  },

  loadTheme: function () {
    var s = wx.getStorageSync('shopSettings')
    if (s && s.themeColor) this.setData({ themeColor: s.themeColor })
  },

  switchTab: function (e) {
    this.setData({ currentTab: e.currentTarget.dataset.tab })
    this.getOrders(true)
  },

  getOrders: function (showLoading) {
    var self = this
    if (showLoading !== false) self.setData({ loading: true })
    var status = self.data.currentTab
    var query = db.collection('orders')
    if (status === 'all') query = query.where({ status: _.in(ADMIN_VISIBLE_STATUS) })
    else query = query.where({ status: status })

    query.orderBy('createTime', 'desc').limit(100).get().then(function (res) {
      self.applyOrders(res.data || [])
    }).catch(function (err) {
      console.error('getOrders失败', err)
      self.setData({ orders: [], loading: false })
    })
  },

  applyOrders: function (orders) {
    for (var i = 0; i < orders.length; i++) {
      orders[i].statusText = this.getStatusText(orders[i].status)
      orders[i].statusClass = orders[i].status
      orders[i].createTimeText = this.formatTime(orders[i].createTime)
    }
    this.setData({ orders: orders, loading: false })
  },

  loadAdminBadges: function () {
    var self = this
    db.collection('orders').where({ status: _.in(ADMIN_REMIND_STATUS) }).limit(300).get().then(function (res) {
      var list = res.data || []
      var counts = { all: 0, paid: 0, delivering: 0 }
      for (var i = 0; i < list.length; i++) {
        if (list[i].status === 'paid') counts.paid++
        if (list[i].status === 'delivering') counts.delivering++
      }
      counts.all = counts.paid + counts.delivering
      self.setData({ badgeCounts: counts })
    }).catch(function (err) {
      console.error('loadAdminBadges失败', err)
    })
  },

  getStats: function () {
    var self = this
    db.collection('orders').where({ status: _.in(ADMIN_VISIBLE_STATUS) }).limit(300).get().then(function (res) {
      self.applyStats(res.data || [])
    }).catch(function (err) {
      console.error('getStats失败', err)
      self.setData({ stats: { todayOrders: 0, todayIncome: '0.00' } })
    })
  },

  applyStats: function (orders) {
    var now = new Date()
    var y = now.getFullYear(), m = now.getMonth(), d = now.getDate()
    var income = 0, todayCount = 0
    for (var i = 0; i < orders.length; i++) {
      var ctDate = toDate(orders[i].createTime)
      if (!ctDate) continue
      if (ctDate.getFullYear() !== y || ctDate.getMonth() !== m || ctDate.getDate() !== d) continue
      todayCount++
      income += (orders[i].finalPrice || orders[i].totalPrice || 0)
    }
    this.setData({ stats: { todayOrders: todayCount, todayIncome: income.toFixed(2) } })
  },

  refreshStats: function () { this.getStats(); this.loadAdminBadges() },

  getStatusText: function (status) {
    var map = { 'pending': '待付款', 'paid': '待配送', 'delivering': '配送中', 'completed': '已完成' }
    return map[status] || status
  },

  formatTime: function (timestamp) {
    var d = toDate(timestamp)
    if (!d) return ''
    var pad = function (n) { return n < 10 ? '0' + n : '' + n }
    return pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes())
  },

  updateStatus: function (orderId, status, toastTitle, directData) {
    var self = this
    db.collection('orders').doc(orderId).update({ data: directData }).then(function () {
      wx.showToast({ title: toastTitle, icon: 'success' })
      self.refreshData(false)
    }).catch(function () {
      wx.showToast({ title: '操作失败', icon: 'none' })
    })
  },

  startDelivery: function (e) {
    var orderId = e.currentTarget.dataset.id
    var self = this
    wx.showModal({
      title: '确认配送', content: '确认开始配送这个订单吗？',
      success: function (res) {
        if (res.confirm) self.updateStatus(orderId, 'delivering', '已开始配送', { status: 'delivering', deliveryTime: db.serverDate() })
      }
    })
  },

  completeDelivery: function (e) {
    var orderId = e.currentTarget.dataset.id
    var self = this
    wx.showModal({
      title: '确认送达', content: '确认订单已送达吗？',
      success: function (res) {
        if (res.confirm) self.updateStatus(orderId, 'completed', '已完成', { status: 'completed', completeTime: db.serverDate() })
      }
    })
  },

  callPhone: function (e) {
    var phone = e.currentTarget.dataset.phone
    if (phone) wx.makePhoneCall({ phoneNumber: phone })
  },

  viewDetail: function (e) { wx.navigateTo({ url: '/pages/order/detail?id=' + e.currentTarget.dataset.id + '&admin=1' }) }
})

function toDate(timestamp) {
  if (!timestamp) return null
  if (typeof timestamp === 'object' && timestamp.$date) return new Date(timestamp.$date)
  return new Date(timestamp)
}
