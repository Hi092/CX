// 分类页面 - 统一配置读取版
var db = wx.cloud.database()
var CONFIG_DOC_ID = 'shop_config_v1'
var DEFAULT_CATEGORIES = ['饮料', '零食', '方便面', '日用品', '烟酒', '文具', '生鲜']

Page({
  data: {
    shopName: '邻里优选',
    shopAvatar: '',
    shopStatus: '营业中',
    shopPhone: '',
    themeColor: '#4A90D9',
    categories: [],
    currentCategory: 0,
    allProducts: [],
    products: [],
    searchKey: '',
    totalCount: 0,
    totalPrice: '0.00',
    diffPrice: '0.00',
    minPrice: 20,
    deliveryFee: 3,
    freeDeliveryPrice: 30,
    showCartPopup: false,
    cartItems: [],
    balls: [
      { id: 0, show: false, x: -100, y: -100 },
      { id: 1, show: false, x: -100, y: -100 },
      { id: 2, show: false, x: -100, y: -100 }
    ],
    cartBounce: false
  },

  onLoad: function () {
    this.loadShopInfo()
    this.loadProducts()
  },

  onShow: function () {
    this.calcCart()
    this.updateCartBadge()
    this.loadShopInfo()
    this.loadProducts()
  },

  isArray: function (v) {
    return Object.prototype.toString.call(v) === '[object Array]'
  },

  buildCategoryList: function (cats) {
    if (!this.isArray(cats) || cats.length === 0) cats = DEFAULT_CATEGORIES
    var list = [{ id: 0, name: '全部' }]
    for (var i = 0; i < cats.length; i++) list.push({ id: i + 1, name: cats[i] })
    return list
  },

  applySettings: function (raw) {
    if (!raw) raw = {}
    var data = raw.settings || raw
    var cats = raw.categories || data.categories || wx.getStorageSync('shopCategories') || DEFAULT_CATEGORIES
    if (!this.isArray(cats) || cats.length === 0) cats = DEFAULT_CATEGORIES

    var s = wx.getStorageSync('shopSettings') || {}
    s.shopName = data.shopName || s.shopName || '邻里优选'
    s.shopAvatar = data.shopAvatar || data.bannerUrl || s.shopAvatar || ''
    s.shopStatus = data.shopStatus || s.shopStatus || '营业中'
    s.shopPhone = data.shopPhone || s.shopPhone || ''
    s.themeColor = data.themeColor || s.themeColor || '#4A90D9'
    s.minPrice = data.minPrice || s.minPrice || 20
    s.deliveryFee = data.deliveryFee || s.deliveryFee || 3
    s.freeDeliveryPrice = data.freeDeliveryPrice || s.freeDeliveryPrice || 30
    s.deliveryRange = data.deliveryRange || s.deliveryRange || ''
    s.openTime = data.openTime || s.openTime || '08:00'
    s.closeTime = data.closeTime || s.closeTime || '23:00'
    s.categories = cats
    wx.setStorageSync('shopSettings', s)
    wx.setStorageSync('shopCategories', cats)

    this.setData({
      shopName: s.shopName,
      shopAvatar: s.shopAvatar,
      shopStatus: s.shopStatus,
      shopPhone: s.shopPhone,
      themeColor: s.themeColor,
      minPrice: s.minPrice,
      deliveryFee: s.deliveryFee,
      freeDeliveryPrice: s.freeDeliveryPrice,
      categories: this.buildCategoryList(cats)
    })
    this.filterProducts()
  },

  loadShopInfo: function () {
    var self = this
    var cached = wx.getStorageSync('shopSettings') || {}
    if (cached) self.applySettings(cached)

    // 统一优先读 products/shop_config_v1，再读 getSettings 云函数
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
        if (res.result && res.result.success && res.result.data) self.applySettings(res.result.data)
      },
      fail: function () {}
    })
  },

  cleanProducts: function (list) {
    var arr = []
    for (var i = 0; i < list.length; i++) {
      var p = list[i]
      if (!p) continue
      if (p._id === CONFIG_DOC_ID || p._type === 'shopConfig') continue
      arr.push(p)
    }
    return arr
  },

  loadProducts: function () {
    var self = this
    wx.cloud.callFunction({
      name: 'getProducts',
      success: function (res) {
        var r = res.result || {}
        var list = r.data || []
        self.setData({ allProducts: self.cleanProducts(list) })
        if (r.settings) self.applySettings(r.settings)
        else if (r.categories && r.categories.length > 0) self.applySettings({ categories: r.categories })
        self.filterProducts()
      },
      fail: function (err) {
        console.error('getProducts失败', err)
        db.collection('products').limit(100).get().then(function (res) {
          self.setData({ allProducts: self.cleanProducts(res.data || []) })
          self.filterProducts()
        }).catch(function () {})
      }
    })
  },

  switchCategory: function (e) {
    var index = parseInt(e.currentTarget.dataset.index)
    this.setData({ currentCategory: index })
    this.filterProducts()
  },

  filterProducts: function () {
    var allProducts = this.data.allProducts
    var currentCategory = this.data.currentCategory
    var categories = this.data.categories
    var searchKey = this.data.searchKey
    var filtered = []
    for (var i = 0; i < allProducts.length; i++) {
      var p = allProducts[i]
      var match = true
      if (currentCategory > 0 && categories[currentCategory]) {
        if (p.category !== categories[currentCategory].name) match = false
      }
      if (match && searchKey) {
        if (!p.name || p.name.toLowerCase().indexOf(searchKey.toLowerCase()) === -1) match = false
      }
      if (match) filtered.push(p)
    }
    this.setData({ products: filtered })
  },

  onSearch: function (e) {
    this.setData({ searchKey: e.detail.value })
    this.filterProducts()
  },

  addToCart: function (e) {
    var product = e.currentTarget.dataset.product
    var cart = wx.getStorageSync('cart') || []
    var idx = -1
    for (var i = 0; i < cart.length; i++) {
      if (cart[i]._id === product._id) { idx = i; break }
    }
    if (idx > -1) cart[idx].quantity++
    else cart.push({ _id: product._id, name: product.name, price: Math.round(product.price * 100) / 100, image: product.image, quantity: 1 })
    wx.setStorageSync('cart', cart)
    this.calcCart()
    this.updateCartBadge()
    var self = this
    setTimeout(function () { self.dropBall(e) }, 30)
  },

  dropBall: function (e) {
    var self = this
    var touch = e.touches && e.touches[0]
    if (!touch) return
    var startX = touch.clientX, startY = touch.clientY
    var query = wx.createSelectorQuery()
    query.select('#cartTarget').boundingClientRect()
    query.exec(function (res) {
      if (!res || !res[0]) return
      var endX = res[0].left + res[0].width / 2, endY = res[0].top + res[0].height / 2
      var balls = self.data.balls
      var bi = -1
      for (var i = 0; i < balls.length; i++) { if (!balls[i].show) { bi = i; break } }
      if (bi === -1) return
      balls[bi].x = startX; balls[bi].y = startY; balls[bi].show = true
      self.setData({ balls: balls })
      self._animate(bi, startX, startY, endX, endY)
    })
  },

  _animate: function (bi, sx, sy, ex, ey) {
    var self = this
    var total = 20, step = 0
    var cpX = (sx + ex) / 2, cpY = Math.min(sy, ey) - 80
    var timer = setInterval(function () {
      step++
      var t = step / total
      var x = (1 - t) * (1 - t) * sx + 2 * (1 - t) * t * cpX + t * t * ex
      var y = (1 - t) * (1 - t) * sy + 2 * (1 - t) * t * cpY + t * t * ey
      var balls = self.data.balls
      balls[bi].x = x; balls[bi].y = y
      self.setData({ balls: balls })
      if (step >= total) {
        clearInterval(timer)
        balls[bi].show = false
        self.setData({ balls: balls, cartBounce: true })
        setTimeout(function () { self.setData({ cartBounce: false }) }, 350)
      }
    }, 18)
  },

  calcCart: function () {
    var cart = wx.getStorageSync('cart') || []
    var totalCount = 0, totalPrice = 0
    for (var i = 0; i < cart.length; i++) {
      totalCount += cart[i].quantity
      totalPrice += Math.round(cart[i].price * cart[i].quantity * 100) / 100
    }
    this.setData({
      totalCount: totalCount,
      totalPrice: totalPrice.toFixed(2),
      diffPrice: Math.max(0, this.data.minPrice - totalPrice).toFixed(2),
      cartItems: cart
    })
  },

  updateCartBadge: function () {
    var count = this.data.totalCount
    if (count > 0) wx.setTabBarBadge({ index: 1, text: count.toString() })
    else wx.removeTabBarBadge({ index: 1 })
  },

  toggleCartPopup: function () {
    var cart = wx.getStorageSync('cart') || []
    if (cart.length === 0) {
      wx.showToast({ title: '购物车是空的', icon: 'none' })
      return
    }
    var totalCount = 0, totalPrice = 0
    for (var i = 0; i < cart.length; i++) {
      totalCount += cart[i].quantity
      totalPrice += Math.round(cart[i].price * cart[i].quantity * 100) / 100
    }
    this.setData({
      showCartPopup: !this.data.showCartPopup,
      cartItems: cart,
      totalCount: totalCount,
      totalPrice: totalPrice.toFixed(2),
      diffPrice: Math.max(0, this.data.minPrice - totalPrice).toFixed(2)
    })
  },

  closeCartPopup: function () { this.setData({ showCartPopup: false }) },

  clearCartPopup: function () {
    var self = this
    wx.showModal({
      title: '提示', content: '确定清空购物车？',
      success: function (res) {
        if (res.confirm) {
          wx.removeStorageSync('cart')
          self.calcCart()
          self.updateCartBadge()
          self.setData({ showCartPopup: false })
        }
      }
    })
  },

  popupIncrease: function (e) {
    var index = e.currentTarget.dataset.index
    var cart = wx.getStorageSync('cart') || []
    if (cart[index]) {
      cart[index].quantity++
      wx.setStorageSync('cart', cart)
      this.calcCart()
      this.updateCartBadge()
    }
  },

  popupDecrease: function (e) {
    var index = e.currentTarget.dataset.index
    var cart = wx.getStorageSync('cart') || []
    if (!cart[index]) return
    if (cart[index].quantity <= 1) cart.splice(index, 1)
    else cart[index].quantity--
    wx.setStorageSync('cart', cart)
    this.calcCart()
    this.updateCartBadge()
    if (cart.length === 0) this.setData({ showCartPopup: false })
  },

  popupCheckout: function () {
    if (parseFloat(this.data.totalPrice) < this.data.minPrice) {
      wx.showToast({ title: '还差' + this.data.diffPrice + '元起送', icon: 'none' })
      return
    }
    var cart = wx.getStorageSync('cart') || []
    wx.setStorageSync('checkoutItems', cart)
    this.setData({ showCartPopup: false })
    wx.navigateTo({ url: '/pages/order/order' })
  },

  goCheckout: function () {
    if (parseFloat(this.data.totalPrice) < this.data.minPrice) {
      wx.showToast({ title: '还差' + this.data.diffPrice + '元起送', icon: 'none' })
      return
    }
    var cart = wx.getStorageSync('cart') || []
    wx.setStorageSync('checkoutItems', cart)
    wx.navigateTo({ url: '/pages/order/order' })
  },

  onPullDownRefresh: function () {
    this.loadShopInfo()
    this.loadProducts()
    wx.stopPullDownRefresh()
  }
})
