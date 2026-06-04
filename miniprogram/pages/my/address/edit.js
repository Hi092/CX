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
    themeColor: '#4A90D9',
    communities: [],
    communityIndex: 0
  },

  onLoad: function (options) {
    var s = wx.getStorageSync('shopSettings')
    if (s && s.themeColor) this.setData({ themeColor: s.themeColor })
    this.loadCommunities()
    if (options.id) {
      this.setData({ id: options.id, isEdit: true })
      wx.setNavigationBarTitle({ title: '编辑地址' })
      this.loadAddress(options.id)
    } else {
      wx.setNavigationBarTitle({ title: '新增地址' })
    }
  },

  loadCommunities: function () {
    var self = this
    // 先从缓存读
    var cached = wx.getStorageSync('shopSettings')
    if (cached) {
      var list = self._parseCommunities(cached)
      if (list.length > 0) self.setData({ communities: list })
    }
    // 再从数据库读
    var db = wx.cloud.database()
    db.collection('settings').doc('shop').get().then(function (res) {
      if (res.data) {
        var list = self._parseCommunities(res.data)
        if (list.length > 0) {
          self.setData({ communities: list })
          // 如果已选的community不在列表里，不影响
          if (self.data.community) {
            var idx = list.indexOf(self.data.community)
            if (idx > -1) self.setData({ communityIndex: idx })
          }
        }
      }
    }).catch(function () {})
  },

  _parseCommunities: function (settings) {
    var list = []
    // 优先用 deliveryAreas 结构化数据
    if (settings.deliveryAreas && settings.deliveryAreas.length > 0) {
      for (var i = 0; i < settings.deliveryAreas.length; i++) {
        var name = settings.deliveryAreas[i].name || settings.deliveryAreas[i].community
        if (name && list.indexOf(name) === -1) list.push(name)
      }
    }
    // 没有就解析 deliveryRange 字符串
    if (list.length === 0 && settings.deliveryRange) {
      var raw = settings.deliveryRange
      var parts = raw.split(/[,，、\n;；]+/)
      for (var i = 0; i < parts.length; i++) {
        var name = parts[i].trim().replace(/^(小区|社区|花园|家园)[：:]\s*/, '')
        if (name && list.indexOf(name) === -1) list.push(name)
      }
    }
    return list
  },

  onCommunityPick: function (e) {
    var index = parseInt(e.detail.value)
    this.setData({ communityIndex: index, community: this.data.communities[index] })
  },

  loadAddress: function (id) {
    var addresses = wx.getStorageSync('addresses') || []
    for (var i = 0; i < addresses.length; i++) {
      if (addresses[i]._id === id) {
        var community = addresses[i].community || ''
        var communityIndex = this.data.communities.indexOf(community)
        this.setData({
          name: addresses[i].name || '',
          phone: addresses[i].phone || '',
          community: community,
          communityIndex: communityIndex > -1 ? communityIndex : 0,
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
    if (!data.community) { wx.showToast({ title: '请选择小区', icon: 'none' }); return }
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
