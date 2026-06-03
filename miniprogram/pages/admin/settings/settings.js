var db = wx.cloud.database()

Page({
  data: {
    shopAvatar: '',
    shopName: '邻里优选',
    shopPhone: '',
    shopStatus: '营业中',
    openTime: '08:00',
    closeTime: '23:00',
    minPrice: 20,
    deliveryFee: 3,
    freeDeliveryPrice: 30,
    deliveryRange: '',
    categories: ['饮料', '零食', '方便面', '日用品', '烟酒', '文具', '生鲜'],
    themeColor: '#4A90D9',
    colorList: [
      '#4A90D9', '#FF6B35', '#4CAF50', '#E91E63',
      '#9C27B0', '#FF9800', '#00BCD4', '#607D8B',
      '#795548', '#333333'
    ],
    statusList: ['营业中', '歇业'],
    loading: false,
    uploading: false
  },

  onLoad: function () {
    var cached = wx.getStorageSync('shopSettings')
    if (cached) {
      this.setData({
        shopAvatar: cached.shopAvatar || '',
        shopName: cached.shopName || '邻里优选',
        shopPhone: cached.shopPhone || '',
        shopStatus: cached.shopStatus || '营业中',
        openTime: cached.openTime || '08:00',
        closeTime: cached.closeTime || '23:00',
        minPrice: cached.minPrice || 20,
        deliveryFee: cached.deliveryFee || 3,
        freeDeliveryPrice: cached.freeDeliveryPrice || 30,
        deliveryRange: cached.deliveryRange || '',
        themeColor: cached.themeColor || '#4A90D9'
      })
    }
    var cachedCats = wx.getStorageSync('shopCategories')
    if (cachedCats && cachedCats.length > 0) {
      this.setData({ categories: cachedCats })
    }
    this.getSettings()
  },

  getSettings: function () {
    var self = this
    db.collection('settings').doc('shop').get().then(function (res) {
      if (res.data) {
        self.setData({
          shopAvatar: res.data.shopAvatar || res.data.bannerUrl || '',
          shopName: res.data.shopName || '邻里优选',
          shopPhone: res.data.shopPhone || '',
          shopStatus: res.data.shopStatus || '营业中',
          openTime: res.data.openTime || '08:00',
          closeTime: res.data.closeTime || '23:00',
          minPrice: res.data.minPrice || 20,
          deliveryFee: res.data.deliveryFee || 3,
          freeDeliveryPrice: res.data.freeDeliveryPrice || 30,
          deliveryRange: res.data.deliveryRange || '',
          categories: res.data.categories || ['饮料', '零食', '方便面', '日用品', '烟酒', '文具', '生鲜'],
          themeColor: res.data.themeColor || '#4A90D9'
        })
      }
    }).catch(function () {})
  },

  chooseAvatar: function () {
    var self = this
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      sizeType: ['compressed'],
      success: function (res) {
        var filePath = res.tempFiles[0].tempFilePath
        self.uploadAvatar(filePath)
      }
    })
  },

  uploadAvatar: function (filePath) {
    var self = this
    self.setData({ uploading: true })
    wx.showLoading({ title: '上传中...' })
    var cloudPath = 'avatar/avatar_' + Date.now() + filePath.match(/\.[^.]+$/)[0]
    wx.cloud.uploadFile({
      cloudPath: cloudPath,
      filePath: filePath,
      success: function (res) {
        self.setData({ shopAvatar: res.fileID, uploading: false })
        wx.hideLoading()
        wx.showToast({ title: '上传成功', icon: 'success' })
      },
      fail: function (err) {
        console.error('上传失败', err)
        self.setData({ uploading: false })
        wx.hideLoading()
        wx.showToast({ title: '上传失败', icon: 'none' })
      }
    })
  },

  removeAvatar: function () {
    var self = this
    wx.showModal({
      title: '提示', content: '确定移除商家头像？',
      success: function (res) { if (res.confirm) self.setData({ shopAvatar: '' }) }
    })
  },

  onStatusChange: function (e) {
    this.setData({ shopStatus: this.data.statusList[e.detail.value] })
  },

  onNameInput: function (e) { this.setData({ shopName: e.detail.value }) },
  onPhoneInput: function (e) { this.setData({ shopPhone: e.detail.value }) },
  onOpenTimeChange: function (e) { this.setData({ openTime: e.detail.value }) },
  onCloseTimeChange: function (e) { this.setData({ closeTime: e.detail.value }) },
  onMinPriceInput: function (e) { this.setData({ minPrice: parseFloat(e.detail.value) || 0 }) },
  onDeliveryFeeInput: function (e) { this.setData({ deliveryFee: parseFloat(e.detail.value) || 0 }) },
  onFreeDeliveryInput: function (e) { this.setData({ freeDeliveryPrice: parseFloat(e.detail.value) || 0 }) },
  onRangeInput: function (e) { this.setData({ deliveryRange: e.detail.value }) },
  selectColor: function (e) { this.setData({ themeColor: e.currentTarget.dataset.color }) },

  addCategory: function () {
    var self = this
    wx.showModal({
      title: '添加分类', editable: true, placeholderText: '输入分类名称',
      success: function (res) {
        if (res.confirm && res.content) {
          var name = res.content.trim()
          if (!name) return
          var cats = self.data.categories
          for (var i = 0; i < cats.length; i++) {
            if (cats[i] === name) { wx.showToast({ title: '分类已存在', icon: 'none' }); return }
          }
          cats.push(name)
          self.setData({ categories: cats })
        }
      }
    })
  },

  deleteCategory: function (e) {
    var index = e.currentTarget.dataset.index
    var self = this
    wx.showModal({
      title: '提示', content: '确定删除「' + self.data.categories[index] + '」分类？',
      success: function (res) {
        if (res.confirm) {
          var cats = self.data.categories
          cats.splice(index, 1)
          self.setData({ categories: cats })
        }
      }
    })
  },

  saveSettings: function () {
    var d = this.data
    if (!d.shopName) { wx.showToast({ title: '请输入店铺名称', icon: 'none' }); return }
    this.setData({ loading: true })

    var settingsData = {
      shopAvatar: d.shopAvatar,
      shopName: d.shopName,
      shopPhone: d.shopPhone,
      shopStatus: d.shopStatus,
      openTime: d.openTime,
      closeTime: d.closeTime,
      minPrice: d.minPrice,
      deliveryFee: d.deliveryFee,
      freeDeliveryPrice: d.freeDeliveryPrice,
      deliveryRange: d.deliveryRange,
      categories: d.categories,
      themeColor: d.themeColor
    }

    wx.setStorageSync('shopSettings', settingsData)
    wx.setStorageSync('shopCategories', d.categories)
    wx.removeStorageSync('productsCache')

    var self = this
    wx.cloud.callFunction({
      name: 'updateSettings',
      data: { data: settingsData },
      success: function () {
        self.setData({ loading: false })
        wx.showToast({ title: '设置已保存', icon: 'success' })
        setTimeout(function () { wx.navigateBack() }, 1000)
      },
      fail: function (err) {
        console.error('updateSettings失败', err)
        self.setData({ loading: false })
        wx.showToast({ title: '保存失败，请重试', icon: 'none' })
      }
    })
  }
})
