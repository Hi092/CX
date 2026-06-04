// 订单确认页
var db = wx.cloud.database()

Page({
  data: {
    items: [],
    totalPrice: '0.00',
    finalPrice: '0.00',
    deliveryFee: 3,
    freeDeliveryPrice: 30,
    address: null,
    remark: '',
    loading: false,
    themeColor: '#4A90D9'
  },

  onLoad: function () {
    var items = wx.getStorageSync('checkoutItems') || []
    var totalPrice = 0
    for (var i = 0; i < items.length; i++) totalPrice += items[i].price * items[i].quantity
    var settings = wx.getStorageSync('shopSettings')
    var deliveryFee = 3, freeDeliveryPrice = 30, themeColor = '#4A90D9'
    if (settings) {
      deliveryFee = settings.deliveryFee || 3
      freeDeliveryPrice = settings.freeDeliveryPrice || 30
      themeColor = settings.themeColor || '#4A90D9'
    }
    var fee = totalPrice >= freeDeliveryPrice ? 0 : deliveryFee
    this.setData({
      items: items, totalPrice: totalPrice.toFixed(2),
      finalPrice: (totalPrice + fee).toFixed(2),
      deliveryFee: deliveryFee, freeDeliveryPrice: freeDeliveryPrice,
      themeColor: themeColor
    })
    this.getAddress()
  },

  onShow: function () {
    this.getAddress()
    var s = wx.getStorageSync('shopSettings')
    if (s && s.themeColor) this.setData({ themeColor: s.themeColor })
  },

  getAddress: function () {
    var selected = wx.getStorageSync('selectedAddress')
    if (selected) { this.setData({ address: selected }); return }
    var addresses = wx.getStorageSync('addresses') || []
    for (var i = 0; i < addresses.length; i++) {
      if (addresses[i].isDefault) { this.setData({ address: addresses[i] }); return }
    }
    if (addresses.length > 0) this.setData({ address: addresses[0] })
  },

  chooseAddress: function () { wx.navigateTo({ url: '/pages/my/address/address?select=1' }) },
  onRemarkInput: function (e) { this.setData({ remark: e.detail.value }) },

  submitOrder: function () {
    var items = this.data.items
    var totalPrice = parseFloat(this.data.totalPrice)
    var deliveryFee = totalPrice >= this.data.freeDeliveryPrice ? 0 : this.data.deliveryFee
    var finalPrice = totalPrice + deliveryFee
    var address = this.data.address
    if (!address) { wx.showToast({ title: '请选择收货地址', icon: 'none' }); return }
    // 检查营业状态
    var settings = wx.getStorageSync('shopSettings')
    if (settings && settings.shopStatus === '歇业') {
      wx.showToast({ title: '店铺已歇业，暂时无法下单', icon: 'none' })
      return
    }
    this.setData({ loading: true })
    var self = this
    var order = {
      orderNo: this._genOrderNo(), items: [], totalPrice: totalPrice,
      deliveryFee: deliveryFee, finalPrice: finalPrice, address: address,
      remark: this.data.remark, status: 'pending', createTime: db.serverDate()
    }
    for (var i = 0; i < items.length; i++) {
      order.items.push({ productId: items[i]._id, name: items[i].name, price: items[i].price, quantity: items[i].quantity, image: items[i].image })
    }
    db.collection('orders').add({ data: order }).then(function (res) {
      var cart = wx.getStorageSync('cart') || []
      var ids = {}
      for (var i = 0; i < items.length; i++) ids[items[i]._id] = true
      var newCart = []
      for (var i = 0; i < cart.length; i++) { if (!ids[cart[i]._id]) newCart.push(cart[i]) }
      wx.setStorageSync('cart', newCart)
      wx.removeStorageSync('checkoutItems')
      wx.removeStorageSync('selectedAddress')
      self.simulatePay(res._id, finalPrice)
    }).catch(function (err) {
      console.error('下单失败', err)
      wx.showToast({ title: '下单失败', icon: 'none' })
      self.setData({ loading: false })
    })
  },

  _genOrderNo: function () {
    var now = new Date()
    var pad = function (n) { return n < 10 ? '0' + n : '' + n }
    var r = Math.floor(Math.random() * 1000).toString()
    while (r.length < 3) r = '0' + r
    return '' + now.getFullYear() + pad(now.getMonth() + 1) + pad(now.getDate()) + pad(now.getHours()) + pad(now.getMinutes()) + pad(now.getSeconds()) + r
  },

  simulatePay: function (orderId, price) {
    var self = this
    wx.showModal({
      title: '模拟支付', content: '订单金额: ¥' + price.toFixed(2),
      confirmText: '确认支付', cancelText: '取消',
      success: function (res) {
        if (res.confirm) {
          db.collection('orders').doc(orderId).update({ data: { status: 'paid', payTime: db.serverDate() } }).then(function () {
            wx.showToast({ title: '支付成功', icon: 'success' })
            setTimeout(function () { wx.switchTab({ url: '/pages/my/my' }) }, 1500)
          })
        } else {
          wx.showToast({ title: '订单已保存', icon: 'none' })
          setTimeout(function () { wx.switchTab({ url: '/pages/my/my' }) }, 1500)
        }
        self.setData({ loading: false })
      }
    })
  }
})
