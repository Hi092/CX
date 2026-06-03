Page({
  data: {
    userInfo: null,
    themeColor: '#4A90D9',
    shopPhone: '',
    tapCount: 0,
    tapTimer: null,
    showModal: false,
    pwdInput: ''
  },

  onShow: function () {
    var info = wx.getStorageSync('userInfo')
    if (info) this.setData({ userInfo: info })
    var s = wx.getStorageSync('shopSettings')
    if (s) {
      if (s.themeColor) this.setData({ themeColor: s.themeColor })
      if (s.shopPhone) this.setData({ shopPhone: s.shopPhone })
    }
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

  goAddress: function () {
    wx.navigateTo({ url: '/pages/my/address/address' })
  },

  callShop: function () {
    var phone = this.data.shopPhone
    if (!phone) {
      wx.showToast({ title: '暂无商家电话', icon: 'none' })
      return
    }
    wx.makePhoneCall({ phoneNumber: phone })
  },

  goSettings: function () {
    wx.navigateTo({ url: '/pages/my/settings/settings' })
  },

  onVersionTap: function () {
    var self = this
    var c = this.data.tapCount + 1
    if (this.data.tapTimer) clearTimeout(this.data.tapTimer)
    var t = setTimeout(function () { self.setData({ tapCount: 0 }) }, 2000)
    this.setData({ tapCount: c, tapTimer: t })
    if (c >= 5) this.setData({ showModal: true, tapCount: 0 })
  },

  onPwdInput: function (e) { this.setData({ pwdInput: e.detail.value }) },

  doVerify: function () {
    var pwd = this.data.pwdInput
    if (!pwd) { wx.showToast({ title: '请输入密码', icon: 'none' }); return }
    if (pwd === '123456') {
      this.closeModal()
      wx.setStorageSync('isShopOwner', true)
      wx.showToast({ title: '验证成功', icon: 'success' })
      setTimeout(function () { wx.navigateTo({ url: '/pages/admin/dashboard/dashboard' }) }, 300)
    } else {
      wx.showToast({ title: '密码错误', icon: 'none' })
    }
  },

  closeModal: function () { this.setData({ showModal: false, pwdInput: '' }) }
})
