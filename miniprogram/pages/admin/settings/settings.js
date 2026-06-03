var db = wx.cloud.database()

Page({
  data: {
    shopAvatar: '',
    bannerList: [],
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
        bannerList: cached.bannerList || [],
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
          bannerList: res.data.bannerList || [],
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

  // === 头像 ===
  chooseAvatar: function () {
    var self = this
    wx.chooseMedia({
      count: 1, mediaType: ['image'], sourceType: ['album', 'camera'], sizeType: ['compressed'],
      success: function (res) { self.uploadFile(res.tempFiles[0].tempFilePath, 'avatar') }
    })
  },

  removeAvatar: function () {
    var self = this
    wx.showModal({ title: '提示', content: '确定移除商家头像？',
      success: function (res) { if (res.confirm) self.setData({ shopAvatar: '' }) }
    })
  },

  // === Banner轮播 ===
  chooseBanner: function () {
    var self = this
    var remain = 5 - self.data.bannerList.length
    if (remain <= 0) { wx.showToast({ title: '最多5张', icon: 'none' }); return }
    wx.chooseMedia({
      count: remain, mediaType: ['image'], sourceType: ['album', 'camera'], sizeType: ['compressed'],
      success: function (res) {
        var files = res.tempFiles
        self.uploadBannerBatch(files, 0)
      }
    })
  },

  uploadBannerBatch: function (files, idx) {
    var self = this
    if (idx >= files.length) { wx.hideLoading(); return }
    wx.showLoading({ title: '上传 ' + (idx + 1) + '/' + files.length })
    var filePath = files[idx].tempFilePath
    var ext = filePath.match(/\.[^.]+$/)
    var cloudPath = 'banner/banner_' + Date.now() + '_' + idx + (ext ? ext[0] : '.jpg')
    wx.cloud.uploadFile({
      cloudPath: cloudPath, filePath: filePath,
      success: function (res) {
        var list = self.data.bannerList
        list.push(res.fileID)
        self.setData({ bannerList: list })
        self.uploadBannerBatch(files, idx + 1)
      },
      fail: function () {
        wx.showToast({ title: '第' + (idx + 1) + '张上传失败', icon: 'none' })
        self.uploadBannerBatch(files, idx + 1)
      }
    })
  },

  removeBanner: function (e) {
    var idx = e.currentTarget.dataset.index
    var self = this
    wx.showModal({ title: '提示', content: '确定移除这张Banner？',
      success: function (res) {
        if (res.confirm) {
          var list = self.data.bannerList
          list.splice(idx, 1)
          self.setData({ bannerList: list })
        }
      }
    })
  },

  // === 通用上传 ===
  uploadFile: function (filePath, type) {
    var self = this
    self.setData({ uploading: true })
    wx.showLoading({ title: '上传中...' })
    var cloudPath = type + '/' + type + '_' + Date.now() + filePath.match(/\.[^.]+$/)[0]
    wx.cloud.uploadFile({
      cloudPath: cloudPath, filePath: filePath,
      success: function (res) {
        if (type === 'avatar') self.setData({ shopAvatar: res.fileID })
        self.setData({ uploading: false })
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

  // === 表单 ===
  onStatusChange: function (e) { this.setData({ shopStatus: this.data.statusList[e.detail.value] }) },
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
    wx.showModal({ title: '添加分类', editable: true, placeholderText: '输入分类名称',
      success: function (res) {
        if (res.confirm && res.content) {
          var name = res.content.trim()
          if (!name) return
          var cats = self.data.categories
          for (var i = 0; i < cats.length; i++) { if (cats[i] === name) { wx.showToast({ title: '分类已存在', icon: 'none' }); return } }
          cats.push(name)
          self.setData({ categories: cats })
        }
      }
    })
  },

  deleteCategory: function (e) {
    var index = e.currentTarget.dataset.index
    var self = this
    wx.showModal({ title: '提示', content: '确定删除「' + self.data.categories[index] + '」分类？',
      success: function (res) { if (res.confirm) { var cats = self.data.categories; cats.splice(index, 1); self.setData({ categories: cats }) } }
    })
  },

  // === 保存 ===
  saveSettings: function () {
    var d = this.data
    if (!d.shopName) { wx.showToast({ title: '请输入店铺名称', icon: 'none' }); return }
    this.setData({ loading: true })

    var settingsData = {
      shopAvatar: d.shopAvatar,
      bannerList: d.bannerList,
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
      name: 'updateSettings', data: { data: settingsData },
      success: function () {
        self.setData({ loading: false })
        wx.showToast({ title: '设置已保存', icon: 'success' })
        setTimeout(function () { wx.navigateBack() }, 1000)
      },
      fail: function () {
        self.setData({ loading: false })
        wx.showToast({ title: '设置已保存', icon: 'success' })
        setTimeout(function () { wx.navigateBack() }, 1000)
      }
    })
  }
})
