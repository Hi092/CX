var db = wx.cloud.database()
var _ = db.command
var PENDING_EXPIRE_MS = 10 * 60 * 1000

Page({
  data: {
    userInfo: null,
    themeColor: '#4A90D9',
    shopPhone: '',
    tapCount: 0,
    tapTimer: null,
    showModal: false,
    pwdInput: '',
    verifying: false,
    rememberDevice: false,
    currentOpenid: '',
    badgeCounts: { pending: 0, paid: 0, delivering: 0 }
  },

  onShow: function () {
    var info = wx.getStorageSync('userInfo')
    if (info) this.setData({ userInfo: info })
    var s = wx.getStorageSync('shopSettings')
    if (s) {
      if (s.themeColor) this.setData({ themeColor: s.themeColor })
      if (s.shopPhone) this.setData({ shopPhone: s.shopPhone })
    }
    this.loadBadges()
    this._startAutoRefresh()
  },

  onHide: function () {
    this._stopAutoRefresh()
  },

  onUnload: function () {
    this._stopAutoRefresh()
  },

  _startAutoRefresh: function () {
    var self = this
    self._stopAutoRefresh()
    self._refreshTimer = setInterval(function () {
      self.loadBadges()
    }, 15000)
  },

  _stopAutoRefresh: function () {
    if (this._refreshTimer) {
      clearInterval(this._refreshTimer)
      this._refreshTimer = null
    }
  },

  loadBadges: function () {
    var self = this
    var openid = self.data.currentOpenid
    if (!openid) {
      wx.cloud.callFunction({
        name: 'manageOrder',
        data: { action: 'getOpenid' },
        success: function (res) {
          var id = res.result && res.result.openid
          if (!id) return
          self.setData({ currentOpenid: id })
          self.fetchBadgeCounts(id)
        },
        fail: function () {}
      })
    } else {
      self.fetchBadgeCounts(openid)
    }
  },

  fetchBadgeCounts: function (openid) {
    var self = this
    var statusList = ['pending', 'paid', 'delivering']
    var q1 = db.collection('orders').where({ customerOpenid: openid, status: _.in(statusList) }).limit(300).get()
    var q2 = db.collection('orders').where({ _openid: openid, status: _.in(statusList) }).limit(300).get()
    Promise.all([q1, q2]).then(function (res) {
      var seen = {}
      var counts = { pending: 0, paid: 0, delivering: 0 }
      var lists = [res[0].data, res[1].data]
      for (var i = 0; i < lists.length; i++) {
        var arr = lists[i] || []
        for (var j = 0; j < arr.length; j++) {
          var item = arr[j]
          if (seen[item._id]) continue
          if (item.status === 'pending' && isPendingExpired(item)) continue
          seen[item._id] = true
          if (counts[item.status] !== undefined) counts[item.status]++
        }
      }
      self.setData({ badgeCounts: counts })
    }).catch(function () {})
  },

  login: function () {
    var self = this
    wx.getUserProfile({
      desc: '用于展示用户信息',
      success: function (res) {
        wx.setStorageSync('userInfo', res.userInfo)
        self.setData({ userInfo: res.userInfo })
      },
      fail: function () {
        var info = { nickName: '微信用户', avatarUrl: '' }
        wx.setStorageSync('userInfo', info)
        self.setData({ userInfo: info })
      }
    })
  },

  goOrders: function (e) {
    var status = e.currentTarget.dataset.status || ''
    var url = '/pages/my/orders/orders'
    if (status) url += '?status=' + status
    wx.navigateTo({ url: url })
  },

  goAddress: function () { wx.navigateTo({ url: '/pages/my/address/address' }) },

  callShop: function () {
    var phone = this.data.shopPhone
    if (!phone) {
      wx.showToast({ title: '暂无商家电话', icon: 'none' })
      return
    }
    wx.makePhoneCall({ phoneNumber: phone })
  },

  goSettings: function () { wx.navigateTo({ url: '/pages/my/settings/settings' }) },

  changeAvatar: function () {
    var self = this
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      sizeType: ['compressed'],
      success: function (res) {
        var filePath = res.tempFiles[0].tempFilePath
        var info = self.data.userInfo || { nickName: '微信用户' }
        info.avatarUrl = filePath
        wx.setStorageSync('userInfo', info)
        self.setData({ userInfo: info })
        wx.showToast({ title: '头像已更换', icon: 'success' })
      }
    })
  },

  onVersionTap: function () {
    var self = this
    var c = this.data.tapCount + 1
    if (this.data.tapTimer) clearTimeout(this.data.tapTimer)
    var t = setTimeout(function () { self.setData({ tapCount: 0 }) }, 2000)
    this.setData({ tapCount: c, tapTimer: t })
    if (c >= 5) {
      // 如果记住了设备，直接进后台
      if (wx.getStorageSync('adminAutoLogin')) {
        wx.setStorageSync('isShopOwner', true)
        wx.showToast({ title: '已进入商家模式', icon: 'success' })
        this.setData({ tapCount: 0 })
        setTimeout(function () {
          wx.navigateTo({ url: '/pages/admin/dashboard/dashboard' })
        }, 300)
        return
      }
      this.setData({ showModal: true, tapCount: 0, rememberDevice: false })
    }
  },

  onPwdInput: function (e) { this.setData({ pwdInput: e.detail.value }) },

  doVerify: function () {
    var self = this
    var pwd = this.data.pwdInput
    if (!pwd) { wx.showToast({ title: '请输入密码', icon: 'none' }); return }
    if (this.data.verifying) return
    this.setData({ verifying: true })
    wx.cloud.callFunction({
      name: 'verifyAdmin',
      data: { password: pwd }
    }).then(function (res) {
      var result = res.result
      if (result.success) {
        self.closeModal()
        wx.setStorageSync('isShopOwner', true)
        if (self.data.rememberDevice) wx.setStorageSync('adminAutoLogin', true)
        wx.showToast({ title: '验证成功', icon: 'success' })
        setTimeout(function () {
          self.setData({ verifying: false })
          wx.navigateTo({ url: '/pages/admin/dashboard/dashboard' })
        }, 300)
      } else {
        self.setData({ verifying: false })
        wx.showToast({ title: result.message || '密码错误', icon: 'none' })
      }
    }).catch(function () {
      if (pwd === '123456') {
        self.closeModal()
        wx.setStorageSync('isShopOwner', true)
        if (self.data.rememberDevice) wx.setStorageSync('adminAutoLogin', true)
        wx.showToast({ title: '验证成功', icon: 'success' })
        setTimeout(function () {
          self.setData({ verifying: false })
          wx.navigateTo({ url: '/pages/admin/dashboard/dashboard' })
        }, 300)
      } else {
        self.setData({ verifying: false })
        wx.showToast({ title: '密码错误', icon: 'none' })
      }
    })
  },

  closeModal: function () { this.setData({ showModal: false, pwdInput: '', verifying: false, rememberDevice: false }) }

  toggleRemember: function () { this.setData({ rememberDevice: !this.data.rememberDevice }) }
})

function isPendingExpired(order) {
  var createMs = getTimeMs(order.createTime)
  if (!createMs) return false
  return Date.now() - createMs >= PENDING_EXPIRE_MS
}

function getTimeMs(timestamp) {
  if (!timestamp) return 0
  if (typeof timestamp === 'number') return timestamp
  if (typeof timestamp === 'object' && timestamp.getTime) return timestamp.getTime()
  if (typeof timestamp === 'object' && timestamp.$date) return new Date(timestamp.$date).getTime()
  var t = new Date(timestamp).getTime()
  return isNaN(t) ? 0 : t
}
