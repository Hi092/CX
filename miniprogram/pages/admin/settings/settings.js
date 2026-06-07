var db = wx.cloud.database()
var CONFIG_DOC_ID = 'shop_config_v1'
var DEFAULT_CATEGORIES = ['饮料', '零食', '方便面', '日用品', '烟酒', '文具', '生鲜']

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
    themeColor: '#4A90D9',
    colorList: [
      '#4A90D9', '#FF6B35', '#4CAF50', '#E91E63',
      '#9C27B0', '#FF9800', '#00BCD4', '#607D8B',
      '#795548', '#333333'
    ],
    statusList: ['营业中', '歇业'],
    loading: false,
    uploading: false,
    printerEnabled: false
  },

  onLoad: function () {
    this.loadCache()
    this.getSettings()
  },

  onShow: function () {
    this.loadCache()
    this.getSettings()
  },

  loadCache: function () {
    var cached = wx.getStorageSync('shopSettings')
    if (cached) this.applySettings(cached)
  },

  applySettings: function (raw) {
    if (!raw) return
    var data = raw.settings || raw
    var cats = raw.categories || data.categories || wx.getStorageSync('shopCategories') || DEFAULT_CATEGORIES
    if (cats) wx.setStorageSync('shopCategories', cats)

    var merged = wx.getStorageSync('shopSettings') || {}
    merged.shopAvatar = data.shopAvatar || data.bannerUrl || ''
    merged.shopName = data.shopName || '邻里优选'
    merged.shopPhone = data.shopPhone || ''
    merged.shopStatus = data.shopStatus || '营业中'
    merged.openTime = data.openTime || '08:00'
    merged.closeTime = data.closeTime || '23:00'
    merged.minPrice = data.minPrice !== undefined ? data.minPrice : 20
    merged.deliveryFee = data.deliveryFee !== undefined ? data.deliveryFee : 3
    merged.freeDeliveryPrice = data.freeDeliveryPrice !== undefined ? data.freeDeliveryPrice : 30
    merged.deliveryRange = data.deliveryRange || ''
    merged.themeColor = data.themeColor || '#4A90D9'
    merged.printerEnabled = data.printerEnabled || false
    merged.categories = cats
    wx.setStorageSync('shopSettings', merged)

    this.setData({
      shopAvatar: merged.shopAvatar,
      shopName: merged.shopName,
      shopPhone: merged.shopPhone,
      shopStatus: merged.shopStatus,
      openTime: merged.openTime,
      closeTime: merged.closeTime,
      minPrice: merged.minPrice,
      deliveryFee: merged.deliveryFee,
      freeDeliveryPrice: merged.freeDeliveryPrice,
      deliveryRange: merged.deliveryRange,
      themeColor: merged.themeColor,
      printerEnabled: merged.printerEnabled
    })
  },

  getSettings: function () {
    var self = this
    // 先读 products 里的统一配置，不依赖 settings 集合权限
    db.collection('products').doc(CONFIG_DOC_ID).get().then(function (res) {
      if (res.data) self.applySettings(res.data)
      else self.loadSettingsFromCloud()
    }).catch(function () {
      self.loadSettingsFromCloud()
    })
  },

  loadSettingsFromCloud: function () {
    var self = this
    wx.cloud.callFunction({
      name: 'getSettings',
      success: function (res) {
        if (res.result && res.result.success && res.result.data) {
          self.applySettings(res.result.data)
        }
      },
      fail: function () {}
    })
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

  goPrinter: function () { wx.navigateTo({ url: '/pages/admin/printer/printer' }) },
  goPassword: function () { wx.navigateTo({ url: '/pages/admin/password/password' }) },

  buildSettingsData: function () {
    var d = this.data
    return {
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
      themeColor: d.themeColor,
      printerEnabled: d.printerEnabled
    }
  },

  saveSettings: function () {
    var settingsData = this.buildSettingsData()
    if (!settingsData.shopName) { wx.showToast({ title: '请输入店铺名称', icon: 'none' }); return }
    if (this.data.loading) return

    this.setData({ loading: true })
    wx.showLoading({ title: '保存中...' })

    var cached = wx.getStorageSync('shopSettings') || {}
    var cats = wx.getStorageSync('shopCategories') || cached.categories || DEFAULT_CATEGORIES
    for (var k in settingsData) { cached[k] = settingsData[k] }
    cached.categories = cats
    wx.setStorageSync('shopSettings', cached)
    wx.setStorageSync('shopCategories', cats)
    wx.removeStorageSync('productsCache')

    var docData = {}
    for (var key in cached) { docData[key] = cached[key] }
    docData._type = 'shopConfig'
    docData.key = 'shopSettings'
    docData.categories = cats
    docData.updateTime = db.serverDate()

    var self = this
    var ok = function () {
      wx.cloud.callFunction({ name: 'updateSettings', data: { data: cached } })
      wx.hideLoading()
      self.setData({ loading: false })
      wx.showToast({ title: '设置已保存', icon: 'success' })
      setTimeout(function () { wx.navigateBack() }, 800)
    }
    var fail = function (err) {
      console.error('保存配置失败', err)
      // 兜底再走原 settings 云函数
      wx.cloud.callFunction({
        name: 'updateSettings',
        data: { data: cached },
        success: function () { ok() },
        fail: function (err2) {
          wx.hideLoading()
          console.error('updateSettings失败', err2)
          self.setData({ loading: false })
          wx.showToast({ title: '保存失败，请重试', icon: 'none' })
        }
      })
    }

    db.collection('products').doc(CONFIG_DOC_ID).update({ data: docData }).then(ok).catch(function () {
      db.collection('products').doc(CONFIG_DOC_ID).set({ data: docData }).then(ok).catch(fail)
    })
  }
})
