// 我的订单
var db = wx.cloud.database()

Page({
  data: {
    orders: [],
    currentTab: 'all',
    loading: true,
    themeColor: '#4A90D9',
    openid: ''
  },

  onLoad: function (options) {
    var s = wx.getStorageSync('shopSettings')
    if (s && s.themeColor) this.setData({ themeColor: s.themeColor })
    if (options.status) this.setData({ currentTab: options.status })
    this.loadOpenid()
    this.getOrders()
    this.startWatch()
  },

  onShow: function () {
    var s = wx.getStorageSync('shopSettings')
    if (s && s.themeColor) this.setData({ themeColor: s.themeColor })
    this.getOrders()
  },

  onUnload: function () {
    if (this._watch) this._watch.close()
  },

  loadOpenid: function () {
    var self = this
    wx.cloud.callFunction({
      name: 'login',
      success: function (res) {
        if (res.result && res.result.openid) self.setData({ openid: res.result.openid })
      },
      fail: function () {}
    })
  },

  startWatch: function () {
    var self = this
    wx.cloud.callFunction({
      name: 'login',
      success: function (res) {
        var openid = res.result && res.result.openid
        if (!openid) return
        self.setData({ openid: openid })
        self._watch = db.collection('orders').where({ customerOpenid: openid }).watch({
          onChange: function (snapshot) {
            if (snapshot.type !== 'init') {
              self.getOrders()
              wx.showToast({ title: '订单状态已更新', icon: 'none' })
            }
          },
          onError: function (err) { console.error('实时监听失败:', err) }
        })
      }
    })
  },

  switchTab: function (e) {
    this.setData({ currentTab: e.currentTarget.dataset.tab })
    this.getOrders()
  },

  getOrders: function () {
    var self = this
    self.setData({ loading: true })
    wx.cloud.callFunction({
      name: 'manageOrder',
      data: { action: 'listMine', status: self.data.currentTab },
      success: function (res) {
        if (res.result && res.result.success) {
          self.applyOrders(res.result.data || [])
        } else {
          self.getOrdersDirect()
        }
      },
      fail: function () { self.getOrdersDirect() }
    })
  },

  getOrdersDirect: function () {
    var self = this
    db.collection('orders').orderBy('createTime', 'desc').limit(50).get().then(function (res) {
      var all = res.data
      var orders = []
      for (var i = 0; i < all.length; i++) {
        if (self.data.openid && all[i].customerOpenid && all[i].customerOpenid !== self.data.openid) continue
        if (self.data.currentTab === 'all' || all[i].status === self.data.currentTab) orders.push(all[i])
      }
      self.applyOrders(orders)
    }).catch(function (err) {
      console.error('我的订单查询失败:', err)
      self.setData({ orders: [], loading: false })
    })
  },

  applyOrders: function (orders) {
    for (var i = 0; i < orders.length; i++) {
      orders[i].statusText = this.getStatusText(orders[i].status)
      orders[i].createTimeText = this.formatTime(orders[i].createTime)
    }
    this.setData({ orders: orders, loading: false })
  },

  getStatusText: function (status) {
    var map = { 'pending': '待付款', 'paid': '待配送', 'delivering': '配送中', 'completed': '已完成' }
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
