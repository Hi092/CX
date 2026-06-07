// 我的订单 - 不依赖login云函数
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
      console.log('订单页 => openid:', openid, 'customerOpenid:', list1.length, '_openid:', list2.length)
      var merged = self.mergeOrders([list1, list2], status)
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
      var at = a.createTime && a.createTime.getTime ? a.createTime.getTime() : 0
      var bt = b.createTime && b.createTime.getTime ? b.createTime.getTime() : 0
      return bt - at
    })
    return out
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
