// 我的订单 - 直读当前用户订单
var db = wx.cloud.database()
var _ = db.command

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

  buildQuery: function (openid, status, limit) {
    var base = { status: status || _.neq('deleted') }
    var q1 = db.collection('orders').where(Object.assign({ customerOpenid: openid }, base)).orderBy('createTime', 'desc').limit(limit)
    var q2 = db.collection('orders').where(Object.assign({ _openid: openid }, base)).orderBy('createTime', 'desc').limit(limit)
    return [q1, q2]
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
      var at = a.createTime && a.createTime.getTime ? a.createTime.getTime() : 0
      var bt = b.createTime && b.createTime.getTime ? b.createTime.getTime() : 0
      return bt - at
    })
    return out
  },

  getOrders: function () {
    var self = this
    self.setData({ loading: true })
    var openid = self.data.openid
    if (!openid) {
      wx.cloud.callFunction({
        name: 'login',
        success: function (res) {
          var id = res.result && res.result.openid
          if (!id) {
            self.setData({ orders: [], loading: false })
            return
          }
          self.setData({ openid: id })
          self.fetchOrders(id)
        },
        fail: function () {
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
    var queries = self.buildQuery(openid, status, 100)
    Promise.all([queries[0].get(), queries[1].get()]).then(function (res) {
      var lists = [res[0].data, res[1].data]
      var merged = self.mergeOrders(lists, status)
      self.applyOrders(merged)
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
