// 收货地址编辑页
Page({
  data: {
    id: '',
    isEdit: false,
    name: '',
    phone: '',
    community: '',
    building: '',
    unit: '',
    room: '',
    isDefault: false,
    loading: false,
    themeColor: '#4A90D9'
  },

  onLoad: function (options) {
    var s = wx.getStorageSync('shopSettings')
    if (s && s.themeColor) this.setData({ themeColor: s.themeColor })
    if (options.id) {
      this.setData({ id: options.id, isEdit: true })
      wx.setNavigationBarTitle({ title: '编辑地址' })
      this.loadAddress(options.id)
    } else {
      wx.setNavigationBarTitle({ title: '新增地址' })
    }
  },

  loadAddress: function (id) {
    var addresses = wx.getStorageSync('addresses') || []
    for (var i = 0; i < addresses.length; i++) {
      if (addresses[i]._id === id) {
        this.setData({
          name: addresses[i].name || '',
          phone: addresses[i].phone || '',
          community: addresses[i].community || '',
          building: addresses[i].building || '',
          unit: addresses[i].unit || '',
          room: addresses[i].room || '',
          isDefault: addresses[i].isDefault || false
        })
        return
      }
    }
  },

  onNameInput: function (e) { this.setData({ name: e.detail.value }) },
  onPhoneInput: function (e) { this.setData({ phone: e.detail.value }) },
  onCommunityInput: function (e) { this.setData({ community: e.detail.value }) },
  onBuildingInput: function (e) { this.setData({ building: e.detail.value }) },
  onUnitInput: function (e) { this.setData({ unit: e.detail.value }) },
  onRoomInput: function (e) { this.setData({ room: e.detail.value }) },
  toggleDefault: function () { this.setData({ isDefault: !this.data.isDefault }) },

  saveAddress: function () {
    var data = this.data
    if (!data.name) { wx.showToast({ title: '请输入姓名', icon: 'none' }); return }
    if (!data.phone) { wx.showToast({ title: '请输入手机号', icon: 'none' }); return }
    if (!data.community) { wx.showToast({ title: '请输入小区名', icon: 'none' }); return }
    if (!data.building) { wx.showToast({ title: '请输入楼号', icon: 'none' }); return }
    if (!data.room) { wx.showToast({ title: '请输入门牌号', icon: 'none' }); return }

    var addresses = wx.getStorageSync('addresses') || []
    var addr = {
      _id: data.isEdit ? data.id : 'addr_' + Date.now(),
      name: data.name, phone: data.phone,
      community: data.community, building: data.building,
      unit: data.unit || '', room: data.room,
      isDefault: data.isDefault
    }

    if (addr.isDefault) {
      for (var i = 0; i < addresses.length; i++) addresses[i].isDefault = false
    }

    if (data.isEdit) {
      var found = false
      for (var i = 0; i < addresses.length; i++) {
        if (addresses[i]._id === data.id) { addresses[i] = addr; found = true; break }
      }
      if (!found) addresses.push(addr)
    } else {
      if (addresses.length === 0) addr.isDefault = true
      addresses.push(addr)
    }

    wx.setStorageSync('addresses', addresses)
    wx.showToast({ title: '保存成功', icon: 'success' })
    setTimeout(function () { wx.navigateBack() }, 1500)
  },

  deleteAddress: function () {
    var self = this
    wx.showModal({
      title: '删除地址', content: '确定删除这个地址？',
      success: function (res) {
        if (res.confirm) {
          var addresses = wx.getStorageSync('addresses') || []
          var newAddresses = []
          for (var i = 0; i < addresses.length; i++) {
            if (addresses[i]._id !== self.data.id) newAddresses.push(addresses[i])
          }
          wx.setStorageSync('addresses', newAddresses)
          wx.showToast({ title: '已删除', icon: 'success' })
          setTimeout(function () { wx.navigateBack() }, 1500)
        }
      }
    })
  }
})
