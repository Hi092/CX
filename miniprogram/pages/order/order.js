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
    this.loadOrderData()
    this.getAddress()
  },

  onShow: function () {
    this.loadOrderData()
    this.getAddress()
  },

  loadOrderData: function () {
    var items = wx.getStorageSync('checkoutItems') || []
    var totalPrice = 0
    for (var i = 0; i < items.length; i++) totalPrice += items[i].price * items[i].quantity
    var settings = wx.getStorageSync('shopSettings') || {}
    var deliveryFee = settings.deliveryFee !== undefined ? settings.deliveryFee : 3
    var freeDeliveryPrice = settings.freeDeliveryPrice !== undefined ? settings.freeDeliveryPrice : 30
    var themeColor = settings.themeColor || '#4A90D9'
    var fee = totalPrice >= freeDeliveryPrice ? 0 : deliveryFee
    this.setData({
      items: items,
      totalPrice: totalPrice.toFixed(2),
      finalPrice: (totalPrice + fee).toFixed(2),
      deliveryFee: deliveryFee,
      freeDeliveryPrice: freeDeliveryPrice,
      themeColor: themeColor
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

  buildOrder: function () {
    var items = this.data.items
    var totalPrice = parseFloat(this.data.totalPrice)
    var deliveryFee = totalPrice >= this.data.freeDeliveryPrice ? 0 : this.data.deliveryFee
    var finalPrice = totalPrice + deliveryFee
    var order = {
      orderNo: this._genOrderNo(),
      items: [],
      totalPrice: totalPrice,
      deliveryFee: deliveryFee,
      finalPrice: finalPrice,
      address: this.data.address,
      remark: this.data.remark,
      status: 'pending'
    }
    for (var i = 0; i < items.length; i++) {
      order.items.push({
        productId: items[i]._id,
        name: items[i].name,
        price: items[i].price,
        quantity: items[i].quantity,
        image: items[i].image
      })
    }
    return order
  },

  submitOrder: function () {
    var items = this.data.items
    if (!items || items.length === 0) { wx.showToast({ title: '请选择商品', icon: 'none' }); return }
    var address = this.data.address
    if (!address) { wx.showToast({ title: '请选择收货地址', icon: 'none' }); return }
    var settings = wx.getStorageSync('shopSettings')
    if (settings && settings.shopStatus === '歇业') {
      wx.showToast({ title: '店铺已歇业，暂时无法下单', icon: 'none' })
      return
    }
    if (this.data.loading) return
    this.setData({ loading: true })

    var self = this
    var order = this.buildOrder()
    wx.cloud.callFunction({
      name: 'manageOrder',
      data: { action: 'create', order: order },
      success: function (res) {
        if (res.result && res.result.success) {
          self.afterOrderCreated(res.result.id, order.finalPrice)
        } else {
          self.setData({ loading: false })
          wx.showToast({ title: '下单失败', icon: 'none' })
        }
      },
      fail: function (err) {
        console.error('manageOrder下单失败，降级直写', err)
        self.createOrderDirect(order)
      }
    })
  },

  createOrderDirect: function (order) {
    var self = this
    order.createTime = db.serverDate()
    db.collection('orders').add({ data: order }).then(function (res) {
      self.afterOrderCreated(res._id, order.finalPrice)
    }).catch(function (err) {
      console.error('下单失败', err)
      wx.showToast({ title: '下单失败', icon: 'none' })
      self.setData({ loading: false })
    })
  },

  afterOrderCreated: function (orderId, finalPrice) {
    var cart = wx.getStorageSync('cart') || []
    var items = this.data.items
    var ids = {}
    for (var i = 0; i < items.length; i++) ids[items[i]._id] = true
    var newCart = []
    for (var j = 0; j < cart.length; j++) { if (!ids[cart[j]._id]) newCart.push(cart[j]) }
    wx.setStorageSync('cart', newCart)
    wx.removeStorageSync('checkoutItems')
    wx.removeStorageSync('selectedAddress')
    this.simulatePay(orderId, finalPrice)
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
          self.payOrder(orderId)
        } else {
          wx.showToast({ title: '订单已保存', icon: 'none' })
          self.setData({ loading: false })
          setTimeout(function () { wx.switchTab({ url: '/pages/my/my' }) }, 1500)
        }
      }
    })
  },

  payOrder: function (orderId) {
    var self = this
    wx.cloud.callFunction({
      name: 'manageOrder',
      data: { action: 'pay', id: orderId },
      success: function (res) {
        if (res.result && res.result.success) {
          wx.showToast({ title: '支付成功', icon: 'success' })
          self.setData({ loading: false })
          setTimeout(function () { wx.switchTab({ url: '/pages/my/my' }) }, 1500)
        } else {
          var msg = res.result && res.result.error === 'STOCK_NOT_ENOUGH' ? (res.result.productName + '库存不足') : '支付失败'
          wx.showToast({ title: msg, icon: 'none' })
          self.setData({ loading: false })
        }
      },
      fail: function (err) {
        console.error('manageOrder支付失败，降级直写', err)
        db.collection('orders').doc(orderId).update({ data: { status: 'paid', payTime: db.serverDate() } }).then(function () {
          wx.showToast({ title: '支付成功', icon: 'success' })
          self.setData({ loading: false })
          setTimeout(function () { wx.switchTab({ url: '/pages/my/my' }) }, 1500)
        }).catch(function () {
          wx.showToast({ title: '支付失败', icon: 'none' })
          self.setData({ loading: false })
        })
      }
    })
  }
})
