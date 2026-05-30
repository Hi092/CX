// 我的页面
const db = wx.cloud.database()
const app = getApp()

Page({
  data: {
    userInfo: null,
    isAdmin: false,
    orderCount: {
      pending: 0,
      delivering: 0,
      completed: 0
    },
    menuList: [
      { icon: '📋', text: '全部订单', url: '/pages/my/orders' },
      { icon: '📍', text: '收货地址', url: '/pages/my/address' },
      { icon: '💬', text: '联系商家', action: 'contact' },
      { icon: '⚙️', text: '设置', url: '/pages/my/settings' }
    ]
  },

  onLoad: function () {
    this.checkLogin()
  },

  onShow: function () {
    if (this.data.userInfo) {
      this.getOrderCount()
    }
  },

  // 检查登录状态
  checkLogin: function () {
    const userInfo = wx.getStorageSync('userInfo')
    if (userInfo) {
      this.setData({ userInfo })
      this.checkAdmin()
      this.getOrderCount()
    }
  },

  // 微信登录
  login: function () {
    wx.getUserProfile({
      desc: '用于完善个人资料',
      success: (res) => {
        const userInfo = res.userInfo
        wx.setStorageSync('userInfo', userInfo)
        this.setData({ userInfo })
        
        // 获取openid
        wx.cloud.callFunction({
          name: 'login',
          data: {}
        }).then(loginRes => {
          const openid = loginRes.result.openid
          wx.setStorageSync('openid', openid)
          this.checkAdmin()
          this.getOrderCount()
        })
      }
    })
  },

  // 检查是否是管理员
  checkAdmin: function () {
    const openid = wx.getStorageSync('openid')
    // 这里填你自己的openid
    const adminOpenid = 'YOUR_OPENID_HERE'
    const isAdmin = openid === adminOpenid
    this.setData({ isAdmin })
    app.globalData.isAdmin = isAdmin
  },

  // 获取订单数量
  getOrderCount: function () {
    // 这里简化处理，实际应该查询云数据库
    this.setData({
      orderCount: {
        pending: 2,
        delivering: 1,
        completed: 5
      }
    })
  },

  // 跳转页面
  goPage: function (e) {
    const { url, action } = e.currentTarget.dataset
    if (action === 'contact') {
      // 联系商家
      wx.makePhoneCall({
        phoneNumber: '13800138000' // 商家电话
      })
    } else if (url) {
      wx.navigateTo({ url })
    }
  },

  // 进入商家管理
  goAdmin: function () {
    wx.navigateTo({
      url: '/pages/admin/orders/orders'
    })
  },

  // 退出登录
  logout: function () {
    wx.showModal({
      title: '提示',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          wx.clearStorageSync()
          this.setData({
            userInfo: null,
            isAdmin: false
          })
        }
      }
    })
  }
})
