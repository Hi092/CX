// 收货地址页
Page({
  data: {
    addresses: [],
    selectMode: false,
    themeColor: '#4A90D9'
  },

  onLoad: function (options) {
    var s = wx.getStorageSync('shopSettings')
    if (s && s.themeColor) this.setData({ themeColor: s.themeColor })
    if (options.select === '1') {
      this.setData({ selectMode: true })
      wx.setNavigationBarTitle({ title: '选择地址' })
    }
  },

  onShow: function () {
    var s = wx.getStorageSync('shopSettings')
    if (s && s.themeColor) this.setData({ themeColor: s.themeColor })
    this.getAddresses()
  },

  getAddresses: function () {
    this.setData({ addresses: wx.getStorageSync('addresses') || [] })
  },

  selectAddress: function (e) {
    if (!this.data.selectMode) return
    var id = e.currentTarget.dataset.id
    var addresses = this.data.addresses
    for (var i = 0; i < addresses.length; i++) {
      if (addresses[i]._id === id) {
        wx.setStorageSync('selectedAddress', addresses[i])
        wx.navigateBack()
        return
      }
    }
  },

  addAddress: function () {
    wx.navigateTo({ url: '/pages/my/address/edit' })
  },

  editAddress: function (e) {
    wx.navigateTo({ url: '/pages/my/address/edit?id=' + e.currentTarget.dataset.id })
  },

  deleteAddress: function (e) {
    var id = e.currentTarget.dataset.id
    var self = this
    wx.showModal({
      title: '删除', content: '确定删除这个地址？',
      success: function (res) {
        if (res.confirm) {
          var addresses = wx.getStorageSync('addresses') || []
          var newAddresses = []
          for (var i = 0; i < addresses.length; i++) {
            if (addresses[i]._id !== id) newAddresses.push(addresses[i])
          }
          wx.setStorageSync('addresses', newAddresses)
          self.getAddresses()
        }
      }
    })
  }
})
