var db = wx.cloud.database()

Page({
  data: {
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
    loading: false,
    hasAutoLogin: false
  },

  onLoad: function () {
    if (wx.getStorageSync('adminAutoLogin')) this.setData({ hasAutoLogin: true })
  },

  clearAutoLogin: function () {
    var self = this
    wx.showModal({
      title: '取消免密登录',
      content: '取消后下次进入商家后台需要重新输入密码',
      success: function (res) {
        if (res.confirm) {
          wx.removeStorageSync('adminAutoLogin')
          self.setData({ hasAutoLogin: false })
          wx.showToast({ title: '已取消免密登录', icon: 'success' })
        }
      }
    })
  },

  onOldPwdInput: function (e) { this.setData({ oldPassword: e.detail.value }) },
  onNewPwdInput: function (e) { this.setData({ newPassword: e.detail.value }) },
  onConfirmPwdInput: function (e) { this.setData({ confirmPassword: e.detail.value }) },

  savePassword: function () {
    var d = this.data
    if (!d.oldPassword) { wx.showToast({ title: '请输入当前密码', icon: 'none' }); return }
    if (!d.newPassword) { wx.showToast({ title: '请输入新密码', icon: 'none' }); return }
    if (d.newPassword.length < 4) { wx.showToast({ title: '密码至少4位', icon: 'none' }); return }
    if (d.newPassword !== d.confirmPassword) { wx.showToast({ title: '两次密码不一致', icon: 'none' }); return }
    if (d.loading) return

    this.setData({ loading: true })
    var self = this

    wx.cloud.callFunction({
      name: 'verifyAdmin',
      data: { password: d.oldPassword },
      success: function (res) {
        if (res.result && res.result.valid) self.updatePassword(d.newPassword)
        else {
          self.setData({ loading: false })
          wx.showToast({ title: '当前密码错误', icon: 'none' })
        }
      },
      fail: function () {
        self.setData({ loading: false })
        wx.showToast({ title: '验证失败，请重试', icon: 'none' })
      }
    })
  },

  updatePassword: function (newPwd) {
    var self = this
    var cached = wx.getStorageSync('shopSettings') || {}
    cached.shopPassword = newPwd
    wx.setStorageSync('shopSettings', cached)

    // 统一走 updateSettings：同步 products/shop_config_v1 和 settings/shop
    wx.cloud.callFunction({
      name: 'updateSettings',
      data: { data: cached },
      success: function (res) {
        self.setData({ loading: false })
        if (res.result && res.result.success === false) {
          wx.showToast({ title: '保存失败', icon: 'none' })
          return
        }
        wx.showToast({ title: '密码已更新', icon: 'success' })
        setTimeout(function () { wx.navigateBack() }, 1000)
      },
      fail: function (err) {
        console.error('更新密码失败', err)
        self.setData({ loading: false })
        wx.showToast({ title: '保存失败，请重试', icon: 'none' })
      }
    })
  }
})
