// 设置页
Page({
  data: {
    userInfo: null,
    themeColor: '#4A90D9'
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
    var self = this
    wx.showModal({
      title: '清除缓存',
      content: '确定清除本地缓存？',
      success: function (res) {
        if (res.confirm) {
          wx.clearStorageSync()
          wx.showToast({ title: '已清除', icon: 'success' })
          self.setData({ userInfo: null })
        }
      }
    })
  },

  logout: function () {
    wx.showModal({
      title: '退出登录',
      content: '确定退出？',
      success: function (res) {
        if (res.confirm) {
          wx.clearStorageSync()
          wx.reLaunch({ url: '/pages/index/index' })
        }
      }
    })
  }
})
