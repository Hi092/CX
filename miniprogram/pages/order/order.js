// 订单确认页 - 云函数优先，失败无缝直连，带最小报错日志
var db = wx.cloud.database()

Page({
  data: {
    items: [],
    previewTotal: '0.00',
    previewFee: '0.00',
    finalPrice: '0.00',
    deliveryFee: 3,
    freeDeliveryPrice: 30,
    minPrice: 20,
    address: null,
    remark: '',
    loading: false,
    submitting: false,
    themeColor: '#4A90D9'
  },

  onLoad: function () {
    try {
      this.loadLocalPreview()
      this.getAddress()
    } catch (err) {
      console.error('确认订单onLoad报错', err)
    }
  },

  onShow: function () {
    try {
      this.loadLocalPreview()
      this.getAddress()
    } catch (err) {
      console.error('确认订单onShow报错', err)
    }
  },

  loadLocalPreview: function () {
    var items = wx.getStorageSync('checkoutItems') || []
    var totalPrice = 0
    for (var i = 0; i < items.length; i++) totalPrice += items[i].price * items[i].quantity
    var settings = wx.getStorageSync('shopSettings') || {}
    var deliveryFee = settings.deliveryFee !== undefined ? settings.deliveryFee : 3
    var freeDeliveryPrice = settings.freeDeliveryPrice !== undefined ? settings.freeDeliveryPrice : 30
    var minPrice = settings.minPrice !== undefined ? settings.minPrice : 20
    var fee = totalPrice >= freeDeliveryPrice ? 0 : deliveryFee
    this.setData({
      items: items,
      previewTotal: totalPrice.toFixed(2),
      previewFee: fee.toFixed(2),
      finalPrice: (totalPrice + fee).toFixed(2),
      deliveryFee: deliveryFee,
      freeDeliveryPrice: freeDeliveryPrice,
      minPrice: minPrice,
      themeColor: settings.themeColor || '#4A90D9'
    })
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

  buildSubmitItems: function () {
    var items = this.data.items || []
    var out = []
    for (var i = 0; i < items.length; i++) {
      if (!items[i]._id || !items[i].quantity || items[i].quantity <= 0) continue
      out.push({ productId: items[i]._id, quantity: items[i].quantity })
    }
    return out
  },

  submitOrder: function () {
    try {
      var items = this.buildSubmitItems()
      if (!items || items.length === 0) { wx.showToast({ title: '请选择商品', icon: 'none' }); return }
      var address = this.data.address
      if (!address) { wx.showToast({ title: '请选择收货地址', icon: 'none' }); return }
      if (this.data.submitting) return
      this.setData({ submitting: true, loading: true })

      var self = this
      wx.cloud.callFunction({
        name: 'manageOrder',
        data: {
          action: 'create',
          items: items,
          address: address,
          remark: this.data.remark || ''
        },
        success: function (res) {
          if (res.result && res.result.success) {
            var r = res.result
            self.setData({
              previewTotal: r.totalPrice.toFixed(2),
              previewFee: r.deliveryFee.toFixed(2),
              finalPrice: r.finalPrice.toFixed(2)
            })
            self.startPayFlow(r.id, r.finalPrice, true)
          } else {
            console.warn('manageOrder下单返回失败，走直连', res)
            self.createOrderDirect()
          }
        },
        fail: function (err) {
          console.error('manageOrder下单请求失败，走直连', err)
          self.createOrderDirect()
        }
      })
    } catch (err) {
      console.error('submitOrder报错', err)
      this.setData({ submitting: false, loading: false })
    }
  },

  createOrderDirect: function () {
    var self = this
    var settings = wx.getStorageSync('shopSettings') || {}
    if (settings.shopStatus === '歇业') {
      wx.showToast({ title: '店铺已歇业，暂时无法下单', icon: 'none' })
      self.setData({ submitting: false, loading: false })
      return
    }

    var cartItems = this.data.items || []
    var totalPrice = 0
    var orderItems = []
    for (var i = 0; i < cartItems.length; i++) {
      var ci = cartItems[i]
      totalPrice += ci.price * ci.quantity
      orderItems.push({ productId: ci._id, name: ci.name, price: ci.price, quantity: ci.quantity, image: ci.image })
    }
    totalPrice = Math.round(totalPrice * 100) / 100
    var freeDeliveryPrice = settings.freeDeliveryPrice !== undefined ? settings.freeDeliveryPrice : 30
    var deliveryFee = settings.deliveryFee !== undefined ? settings.deliveryFee : 3
    var fee = totalPrice >= freeDeliveryPrice ? 0 : deliveryFee
    var finalPrice = Math.round((totalPrice + fee) * 100) / 100

    var order = {
      orderNo: this._genOrderNo(),
      items: orderItems,
      totalPrice: totalPrice,
      deliveryFee: fee,
      finalPrice: finalPrice,
      address: this.data.address,
      remark: this.data.remark || '',
      status: 'pending',
      source: 'miniprogram_fallback'
    }
    db.collection('orders').add({ data: order }).then(function (res) {
      self.startPayFlow(res._id, finalPrice, false)
    }).catch(function (err) {
      console.error('下单失败', err)
      wx.showToast({ title: '下单失败', icon: 'none' })
      self.setData({ submitting: false, loading: false })
    })
  },

  startPayFlow: function (orderId, finalPrice, useCloudPay) {
    var self = this
    wx.showModal({
      title: '模拟支付',
      content: '订单金额: ¥' + finalPrice.toFixed(2),
      confirmText: '确认支付', cancelText: '取消',
      success: function (res) {
        if (res.confirm) {
          if (useCloudPay) {
            self.payOrderCloud(orderId)
          } else {
            self.payOrderDirect(orderId)
          }
        } else {
          wx.showToast({ title: '订单已保存', icon: 'none' })
          self.setData({ submitting: false, loading: false })
          setTimeout(function () { wx.switchTab({ url: '/pages/my/my' }) }, 1500)
        }
      }
    })
  },

  payOrderCloud: function (orderId) {
    var self = this
    wx.cloud.callFunction({
      name: 'manageOrder',
      data: { action: 'pay', id: orderId },
      success: function (res) {
        if (res.result && res.result.success) {
          self.onPaySuccess()
        } else {
          console.warn('manageOrder支付返回失败，走直连', res)
          self.payOrderDirect(orderId)
        }
      },
      fail: function (err) {
        console.error('manageOrder支付请求失败，走直连', err)
        self.payOrderDirect(orderId)
      }
    })
  },

  payOrderDirect: function (orderId) {
    var self = this
    db.collection('orders').doc(orderId).update({
      data: { status: 'paid', payTime: new Date() }
    }).then(function () {
      self.onPaySuccess()
    }).catch(function (err) {
      console.error('直连支付失败', err)
      wx.showToast({ title: '支付失败', icon: 'none' })
      self.setData({ submitting: false, loading: false })
    })
  },

  onPaySuccess: function () {
    var cart = wx.getStorageSync('cart') || []
    var items = this.data.items || []
    var ids = {}
    for (var i = 0; i < items.length; i++) ids[items[i]._id] = true
    var newCart = []
    for (var j = 0; j < cart.length; j++) { if (!ids[cart[j]._id]) newCart.push(cart[j]) }
    wx.setStorageSync('cart', newCart)
    wx.removeStorageSync('checkoutItems')
    wx.removeStorageSync('selectedAddress')
    wx.showToast({ title: '支付成功', icon: 'success' })
    this.setData({ submitting: false, loading: false })
    setTimeout(function () { wx.switchTab({ url: '/pages/my/my' }) }, 1500)
  },

  _genOrderNo: function () {
    var now = new Date()
    var pad = function (n) { return n < 10 ? '0' + n : '' + n }
    var r = Math.floor(Math.random() * 1000).toString()
    while (r.length < 3) r = '0' + r
    return '' + now.getFullYear() + pad(now.getMonth() + 1) + pad(now.getDate()) + pad(now.getHours()) + pad(now.getMinutes()) + pad(now.getSeconds()) + r
  }
})
