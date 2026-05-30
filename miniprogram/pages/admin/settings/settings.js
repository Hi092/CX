// 店铺设置页面
const db = wx.cloud.database()

Page({
  data: {
    shopName: '邻居优选',
    shopPhone: '',
    openTime: '08:00',
    closeTime: '23:00',
    minPrice: 20,
    deliveryFee: 2,
    freeDeliveryPrice: 20,
    deliveryRange: '幸福小区',
    loading: false
  },

  onLoad: function () {
    this.getSettings()
  },

  // 获取设置
  getSettings: function () {
    db.collection('settings').doc('shop').get().then(res => {
      if (res.data) {
        this.setData(res.data)
      }
    }).catch(err => {
      console.log('使用默认设置')
    })
  },

  // 输入店铺名称
  onNameInput: function (e) {
    this.setData({ shopName: e.detail.value })
  },

  // 输入电话
  onPhoneInput: function (e) {
    this.setData({ shopPhone: e.detail.value })
  },

  // 选择开始时间
  onOpenTimeChange: function (e) {
    this.setData({ openTime: e.detail.value })
  },

  // 选择结束时间
  onCloseTimeChange: function (e) {
    this.setData({ closeTime: e.detail.value })
  },

  // 输入起送价
  onMinPriceInput: function (e) {
    this.setData({ minPrice: parseFloat(e.detail.value) || 0 })
  },

  // 输入配送费
  onDeliveryFeeInput: function (e) {
    this.setData({ deliveryFee: parseFloat(e.detail.value) || 0 })
  },

  // 输入免配送费金额
  onFreeDeliveryInput: function (e) {
    this.setData({ freeDeliveryPrice: parseFloat(e.detail.value) || 0 })
  },

  // 输入配送范围
  onRangeInput: function (e) {
    this.setData({ deliveryRange: e.detail.value })
  },

  // 保存设置
  saveSettings: function () {
    const { shopName, shopPhone, openTime, closeTime, minPrice, deliveryFee, freeDeliveryPrice, deliveryRange } = this.data
    
    if (!shopName) {
      wx.showToast({ title: '请输入店铺名称', icon: 'none' })
      return
    }

    this.setData({ loading: true })

    const settings = {
      shopName,
      shopPhone,
      openTime,
      closeTime,
      minPrice,
      deliveryFee,
      freeDeliveryPrice,
      deliveryRange,
      updateTime: db.serverDate()
    }

    // 使用upsert方式保存
    db.collection('settings').doc('shop').set({
      data: settings
    }).then(() => {
      wx.showToast({ title: '保存成功', icon: 'success' })
      this.setData({ loading: false })
    }).catch(err => {
      console.error('保存失败', err)
      wx.showToast({ title: '保存失败', icon: 'none' })
      this.setData({ loading: false })
    })
  }
})
