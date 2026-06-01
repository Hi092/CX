App({
  onLaunch: function () {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
    } else {
      wx.cloud.init({
        env: 'cloudbase-d4g89p06z28ee6642',
        traceUser: true
      })
    }
  },
  globalData: {
    userInfo: null,
    cart: []
  }
})
