App({
  onLaunch: function () {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
    } else {
      wx.cloud.init({
        env: 'cx-shop', // 云开发环境ID，需要替换成你自己的
        traceUser: true
      })
    }
    
    this.globalData = {
      userInfo: null,
      isAdmin: false, // 是否是商家
      cart: [] // 购物车
    }
  },
  
  // 检查是否是管理员
  checkAdmin: function() {
    const openid = wx.getStorageSync('openid')
    // 这里填你的openid，首次登录后在控制台获取
    const adminOpenid = 'YOUR_OPENID_HERE'
    return openid === adminOpenid
  }
})
