var db = wx.cloud.database()

Page({
  data: {
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
    loading: false
  },

  onLoad: function () {
    // 从缓存读取当前密码（如果有）
    var cached = wx.getStorageSync('shopSettings')
    if (cached && cached.shopPassword) {
      // 不显示密码，但标记已设置
    }
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

    this.setData({ loading: true })
    var self = this

    // 验证旧密码
    wx.cloud.callFunction({
      name: 'verifyAdmin',
      data: { password: d.oldPassword },
      success: function (res) {
        if (res.result && res.result.valid) {
          // 旧密码正确，更新密码
          self.updatePassword(d.newPassword)
        } else {
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
    // 更新数据库中的密码
    db.collection('settings').doc('shop').update({
      data: { shopPassword: newPwd }
    }).then(function () {
      // 更新本地缓存
      var cached = wx.getStorageSync('shopSettings') || {}
      cached.shopPassword = newPwd
      wx.setStorageSync('shopSettings', cached)
      
      self.setData({ loading: false })
      wx.showToast({ title: '密码已更新', icon: 'success' })
      setTimeout(function () { wx.navigateBack() }, 1000)
    }).catch(function (err) {
      console.error('更新密码失败', err)
      self.setData({ loading: false })
      wx.showToast({ title: '保存失败，请重试', icon: 'none' })
    })
  }
})
