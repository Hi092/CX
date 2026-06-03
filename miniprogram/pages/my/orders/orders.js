// 我的订单
var db = wx.cloud.database()

Page({
  data: {
    orders: [],
    currentTab: 'all',
    loading: true,
    themeColor: '#4A90D9',
    tabs: [
      { key: 'all', text: '全部', icon: '📋' },
      { key: 'paid', text: '待配送', icon: '📦', badge: 0 },
      { key: 'delivering', text: '配送中', icon: '🚗', badge: 0 },
      { key: 'completed', text: '已完成', icon: '✅', badge: 0 }
    ],
    shopPhone: ''
  },

  onLoad: function (options) {
    var s = wx.getStorageSync('shopSettings')
    if (s) {
      if (s.themeColor) this.setData({ themeColor: s.themeColor })
      if (s.shopPhone) this.setData({ shopPhone: s.shopPhone })
    }
    if (options.status) this.setData({ currentTab: options.status })
    this.getOrders()
  },

  onShow: function () {
    var s = wx.getStorageSync('shopSettings')
    if (s) {
      if (s.themeColor) this.setData({ themeColor: s.themeColor })
      if (s.shopPhone) this.setData({ shopPhone: s.shopPhone })
    }
    this.getOrders()
  },

  switchTab: function (e) {
    var tab = e.currentTarget.dataset.tab
    this.setData({ currentTab: tab })
    // 清除该tab的未读
    var tabs = this.data.tabs
    for (var i = 0; i < tabs.length; i++) {
      if (tabs[i].key === tab) { tabs[i].badge = 0; break }
    }
    this.setData({ tabs: tabs })
    this.getOrders()
  },

  getOrders: function () {
    var self = this
    self.setData({ loading: true })
    var query = db.collection('orders').orderBy('createTime', 'desc')
    if (self.data.currentTab !== 'all') {
      query = query.where({ status: self.data.currentTab })
    }
    query.limit(20).get().then(function (res) {
      var orders = res.data
      var badges = { paid: 0, delivering: 0 }
      for (var i = 0; i < orders.length; i++) {
        orders[i].statusText = self.getStatusText(orders[i].status)
        orders[i].createTimeText = self.formatTime(orders[i].createTime)
        if (orders[i].status === 'paid') badges.paid++
        if (orders[i].status === 'delivering') badges.delivering++
      }
      var tabs = self.data.tabs
      for (var j = 0; j < tabs.length; j++) {
        if (badges[tabs[j].key] !== undefined) tabs[j].badge = badges[tabs[j].key]
      }
      self.setData({ orders: orders, loading: false, tabs: tabs })
    }).catch(function () {
      self.setData({ orders: [], loading: false })
    })
  },

  getStatusText: function (status) {
    var map = { 'pending': '待支付', 'paid': '待配送', 'delivering': '配送中', 'completed': '已完成' }
    return map[status] || status
  },

  formatTime: function (timestamp) {
    if (!timestamp) return ''
    var d = typeof timestamp === 'object' && timestamp.$date ? new Date(timestamp.$date) : new Date(timestamp)
    var pad = function (n) { return n < 10 ? '0' + n : '' + n }
    return pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes())
  },

  viewDetail: function (e) {
    wx.navigateTo({ url: '/pages/order/detail?id=' + e.currentTarget.dataset.id })
  },

  callShop: function () {
    var phone = this.data.shopPhone
    if (phone) {
      wx.makePhoneCall({ phoneNumber: phone })
    } else {
      wx.showToast({ title: '商家未设置电话', icon: 'none' })
    }
  },

  onPullDownRefresh: function () {
    this.getOrders()
    wx.stopPullDownRefresh()
  }
})
