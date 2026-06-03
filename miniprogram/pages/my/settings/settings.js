// 设置页
Page({
  data: {
    userInfo: null,
    themeColor: '#4A90D9',
    tapCount: 0,
    tapTimer: null,
    showModal: false,
    pwdInput: ''
  },

  onLoad: function () {
    var info = wx.getStorageSync('userInfo')
    if (info) this.setData({ userInfo: info })
    var s = wx.getStorageSync('shopSettings')
    if (s && s.themeColor) this.setData({ themeColor: s.themeColor })
  },

  onShow: function () {
    var info = wx.getStorageSync('userInfo')
    if (info) this.setData({ userInfo: info })
    var s = wx.getStorageSync('shopSettings')
    if (s && s.themeColor) this.setData({ themeColor: s.themeColor })
  },

  clearCache: function () {
    wx.showModal({
      title: '清除缓存',
      content: '确定清除本地缓存？',
      success: function (res) {
        if (res.confirm) {
          wx.clearStorageSync()
          wx.showToast({ title: '缓存已清除', icon: 'success' })
        }
      }
    })
  },

  logout: function () {
    this.setData({ showModal: true })
  },

  onPwdInput: function (e) { this.setData({ pwdInput: e.detail.value }) },

  doLogout: function () {
    var self = this
    wx.showModal({
      title: '退出登录',
      content: '确定退出？退出后将清除所有本地数据。',
      success: function (res) {
        if (res.confirm) {
          wx.clearStorageSync()
          self.setData({ userInfo: null, showModal: false, pwdInput: '' })
          wx.showToast({ title: '已退出', icon: 'success' })
          setTimeout(function () {
            wx.switchTab({ url: '/pages/category/category' })
          }, 1000)
        }
      }
    })
  },

  closeLogoutModal: function () {
    this.setData({ showModal: false, pwdInput: '' })
  },

  onVersionTap: function () {
    var self = this
    var c = this.data.tapCount + 1
    if (this.data.tapTimer) clearTimeout(this.data.tapTimer)
    var t = setTimeout(function () { self.setData({ tapCount: 0 }) }, 2000)
    this.setData({ tapCount: c, tapTimer: t })
    if (c >= 5) this.setData({ showModal: true, tapCount: 0 })
  },

  doVerify: function () {
    var pwd = this.data.pwdInput
    if (!pwd) { wx.showToast({ title: '请输入密码', icon: 'none' }); return }
    if (pwd === '123456') {
      this.closeLogoutModal()
      wx.setStorageSync('isShopOwner', true)
      wx.showToast({ title: '验证成功', icon: 'success' })
      setTimeout(function () { wx.navigateTo({ url: '/pages/admin/dashboard/dashboard' }) }, 300)
    } else {
      wx.showToast({ title: '密码错误', icon: 'none' })
    }
  }
})
