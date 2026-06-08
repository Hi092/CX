// 购物车页面
var cloudImage = require('../../utils/cloudImage')

Page({
  data: {
    cart: [],
    totalPrice: '0.00',
    totalCount: 0,
    selectAll: true,
    minPrice: 20,
    deliveryFee: 3,
    freeDeliveryPrice: 30,
    diffPrice: '0.00',
    themeColor: '#4A90D9'
  },

  applySettings: function () {
    var settings = wx.getStorageSync('shopSettings') || {}
    this.setData({
      minPrice: settings.minPrice !== undefined ? settings.minPrice : 20,
      deliveryFee: settings.deliveryFee !== undefined ? settings.deliveryFee : 3,
      freeDeliveryPrice: settings.freeDeliveryPrice !== undefined ? settings.freeDeliveryPrice : 30,
      themeColor: settings.themeColor || '#4A90D9'
    })
  },

  onLoad: function () {
    this.applySettings()
  },

  onShow: function () {
    this.applySettings()
    this.loadCart()
  },

  loadCart: function () {
    var self = this
    var cart = wx.getStorageSync('cart') || []
    var oldCart = this.data.cart || []
    for (var i = 0; i < cart.length; i++) {
      var found = false
      for (var j = 0; j < oldCart.length; j++) {
        if (cart[i]._id === oldCart[j]._id) { cart[i].selected = oldCart[j].selected; found = true; break }
      }
      if (!found) cart[i].selected = true
    }
    // 解析云存储图片
    var cartCopy = []
    for (var k = 0; k < cart.length; k++) cartCopy.push({
      _id: cart[k]._id, name: cart[k].name, price: cart[k].price,
      image: cart[k].image, quantity: cart[k].quantity, selected: cart[k].selected
    })
    cloudImage.resolveCloudImageURLs(cartCopy, function (resolved) {
      self.setData({ cart: resolved })
      self.calcTotal()
    })
  },

  calcTotal: function () {
    var cart = this.data.cart
    var totalPrice = 0, totalCount = 0, selectAll = true
    for (var i = 0; i < cart.length; i++) {
      if (cart[i].selected) { totalPrice += cart[i].price * cart[i].quantity; totalCount += cart[i].quantity }
      else selectAll = false
    }
    this.setData({
      totalPrice: totalPrice.toFixed(2),
      totalCount: totalCount,
      selectAll: cart.length > 0 ? selectAll : false,
      diffPrice: Math.max(0, this.data.minPrice - totalPrice).toFixed(2)
    })
  },

  toggleSelect: function (e) {
    var index = e.currentTarget.dataset.index
    var key = 'cart[' + index + '].selected'
    this.setData({ [key]: !this.data.cart[index].selected })
    this.calcTotal(); this.saveCart()
  },

  toggleSelectAll: function () {
    var selectAll = !this.data.selectAll
    var cart = this.data.cart
    for (var i = 0; i < cart.length; i++) cart[i].selected = selectAll
    this.setData({ cart: cart, selectAll: selectAll })
    this.calcTotal(); this.saveCart()
  },

  decrease: function (e) {
    var index = e.currentTarget.dataset.index
    var cart = this.data.cart
    var self = this
    if (cart[index].quantity <= 1) {
      wx.showModal({ title: '提示', content: '确定删除？',
        success: function (res) { if (res.confirm) { cart.splice(index, 1); self.setData({ cart: cart }); self.calcTotal(); self.saveCart() } }
      })
    } else {
      var key = 'cart[' + index + '].quantity'
      this.setData({ [key]: cart[index].quantity - 1 })
      this.calcTotal(); this.saveCart()
    }
  },

  increase: function (e) {
    var index = e.currentTarget.dataset.index
    var key = 'cart[' + index + '].quantity'
    this.setData({ [key]: this.data.cart[index].quantity + 1 })
    this.calcTotal(); this.saveCart()
  },

  saveCart: function () {
    var cart = this.data.cart
    // 存回原始 fileID，避免临时URL过期
    var toSave = []
    for (var i = 0; i < cart.length; i++) {
      toSave.push({
        _id: cart[i]._id, name: cart[i].name, price: cart[i].price,
        image: cart[i]._imageFileID || cart[i].image,
        quantity: cart[i].quantity, selected: cart[i].selected
      })
    }
    wx.setStorageSync('cart', toSave)
    this.updateCartBadge()
  },

  updateCartBadge: function () {
    var cart = this.data.cart, count = 0
    for (var i = 0; i < cart.length; i++) count += cart[i].quantity
    if (count > 0) wx.setTabBarBadge({ index: 1, text: count.toString() })
    else wx.removeTabBarBadge({ index: 1 })
  },

  clearCart: function () {
    var self = this
    wx.showModal({ title: '提示', content: '确定清空购物车？',
      success: function (res) { if (res.confirm) { self.setData({ cart: [] }); self.calcTotal(); wx.removeStorageSync('cart'); self.updateCartBadge() } }
    })
  },

  goShopping: function () { wx.switchTab({ url: '/pages/category/category' }) },

  checkout: function () {
    var cart = this.data.cart, totalPrice = parseFloat(this.data.totalPrice), minPrice = this.data.minPrice
    var selectedItems = []
    for (var i = 0; i < cart.length; i++) { if (cart[i].selected) selectedItems.push(cart[i]) }
    if (selectedItems.length === 0) { wx.showToast({ title: '请选择商品', icon: 'none' }); return }
    if (totalPrice < minPrice) { wx.showToast({ title: '满' + minPrice + '元起送', icon: 'none' }); return }
    wx.setStorageSync('checkoutItems', selectedItems)
    wx.navigateTo({ url: '/pages/order/order' })
  }
})
