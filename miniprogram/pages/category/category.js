var db = wx.cloud.database()
var _shopName = '邻里优选'
var _themeColor = '#4A90D9'
var _shopAvatar = ''
var _shopStatus = '营业中'

Page({
  data: {
    shopName: '邻里优选',
    shopAvatar: '',
    shopStatus: '营业中',
    themeColor: '#4A90D9',
    bannerList: [],
    categories: [{ name: '全部', id: 'all' }],
    currentCategory: 0,
    products: [],
    allProducts: [],
    cart: [],
    totalCount: 0,
    totalPrice: 0,
    minPrice: 20,
    diffPrice: 20,
    balls: [],
    showCartPopup: false,
    cartItems: [],
    cartBounce: false,
    searchKey: ''
  },

  onLoad: function () {
    var cached = wx.getStorageSync('shopSettings')
    if (cached) {
      _shopName = cached.shopName || '邻里优选'
      _themeColor = cached.themeColor || '#4A90D9'
      _shopAvatar = cached.shopAvatar || ''
      _shopStatus = cached.shopStatus || '营业中'
      this.setData({
        shopName: _shopName, themeColor: _themeColor,
        shopAvatar: _shopAvatar, shopStatus: _shopStatus,
        bannerList: cached.bannerList || [],
        minPrice: cached.minPrice || 20
      })
      var cats = wx.getStorageSync('shopCategories')
      if (cats && cats.length > 0) {
        var arr = [{ name: '全部', id: 'all' }]
        for (var i = 0; i < cats.length; i++) arr.push({ name: cats[i], id: cats[i] })
        this.setData({ categories: arr })
      }
    }
    this.getSettings()
    this.getProducts()
  },

  onShow: function () {
    var self = this
    wx.getStorage({ key: 'cart', success: function (r) { self._updateCart(r.data || []) } })
    var cached = wx.getStorageSync('shopSettings')
    if (cached) {
      _shopName = cached.shopName || '邻里优选'
      _themeColor = cached.themeColor || '#4A90D9'
      _shopAvatar = cached.shopAvatar || ''
      _shopStatus = cached.shopStatus || '营业中'
      self.setData({
        shopName: _shopName, themeColor: _themeColor,
        shopAvatar: _shopAvatar, shopStatus: _shopStatus,
        bannerList: cached.bannerList || [],
        minPrice: cached.minPrice || 20
      })
    }
  },

  getSettings: function () {
    var self = this
    db.collection('settings').doc('shop').get().then(function (res) {
      if (res.data) {
        _shopName = res.data.shopName || '邻里优选'
        _themeColor = res.data.themeColor || '#4A90D9'
        _shopAvatar = res.data.shopAvatar || res.data.bannerUrl || ''
        _shopStatus = res.data.shopStatus || '营业中'
        self.setData({
          shopName: _shopName, themeColor: _themeColor,
          shopAvatar: _shopAvatar, shopStatus: _shopStatus,
          bannerList: res.data.bannerList || [],
          minPrice: res.data.minPrice || 20
        })
        wx.setNavigationBarTitle({ title: _shopName })
        var cats = res.data.categories
        if (cats && cats.length > 0) {
          var arr = [{ name: '全部', id: 'all' }]
          for (var i = 0; i < cats.length; i++) arr.push({ name: cats[i], id: cats[i] })
          self.setData({ categories: arr })
        }
      }
    }).catch(function () {})
  },

  getProducts: function () {
    var self = this
    var cached = wx.getStorageSync('productsCache')
    if (cached) { self.setData({ allProducts: cached }); self.filterProducts(); }
    db.collection('products').orderBy('sales', 'desc').limit(100).get().then(function (res) {
      self.setData({ allProducts: res.data })
      self.filterProducts()
    }).catch(function () { if (!cached) self.setData({ products: [] }) })
  },

  onPullDownRefresh: function () {
    wx.removeStorageSync('productsCache')
    this.getSettings()
    this.getProducts()
    wx.stopPullDownRefresh()
  },

  filterProducts: function () {
    var all = this.data.allProducts
    var cat = this.data.categories[this.data.currentCategory]
    var key = this.data.searchKey.toLowerCase()
    var result = []
    for (var i = 0; i < all.length; i++) {
      var p = all[i]
      if (cat && cat.id !== 'all' && p.category !== cat.name) continue
      if (key && p.name.toLowerCase().indexOf(key) < 0 && (!p.category || p.category.toLowerCase().indexOf(key) < 0)) continue
      result.push(p)
    }
    this.setData({ products: result })
  },

  onBannerError: function (e) { console.warn('banner加载失败', e.detail) },

  switchCategory: function (e) { this.setData({ currentCategory: e.currentTarget.dataset.index, searchKey: '' }); this.filterProducts() },
  onSearch: function (e) { this.setData({ searchKey: e.detail.value }); this.filterProducts() },

  addToCart: function (e) {
    var product = e.currentTarget.dataset.product
    var cart = this.data.cart
    var found = false
    for (var i = 0; i < cart.length; i++) { if (cart[i]._id === product._id) { cart[i].quantity++; found = true; break } }
    if (!found) { cart.push({ _id: product._id, name: product.name, price: product.price, image: product.image, quantity: 1 }) }
    this._updateCart(cart)
    this._dropBall()
  },

  toggleCartPopup: function () { if (this.data.totalCount > 0) this.setData({ showCartPopup: !this.data.showCartPopup, cartItems: this.data.cart }) },
  closeCartPopup: function () { this.setData({ showCartPopup: false }) },

  popupIncrease: function (e) { var cart = this.data.cart; cart[e.currentTarget.dataset.index].quantity++; this._updateCart(cart) },
  popupDecrease: function (e) {
    var idx = e.currentTarget.dataset.index, cart = this.data.cart
    if (cart[idx].quantity > 1) { cart[idx].quantity-- } else { cart.splice(idx, 1) }
    this._updateCart(cart); if (cart.length === 0) this.setData({ showCartPopup: false })
  },

  clearCartPopup: function () {
    var self = this
    wx.showModal({ title: '提示', content: '确定清空购物车？',
      success: function (res) { if (res.confirm) { self._updateCart([]); self.setData({ showCartPopup: false, cartItems: [] }) } }
    })
  },

  popupCheckout: function () { if (this.data.totalPrice >= this.data.minPrice) { this.setData({ showCartPopup: false }); this.goCheckout() } },

  _updateCart: function (cart) {
    var count = 0, price = 0
    for (var i = 0; i < cart.length; i++) { count += cart[i].quantity; price += cart[i].price * cart[i].quantity }
    var diff = this.data.minPrice - price
    this.setData({ cart: cart, totalCount: count, totalPrice: price, diffPrice: diff > 0 ? diff.toFixed(2) : 0, cartItems: cart, cartBounce: true })
    wx.setStorageSync('cart', cart)
    var self = this; setTimeout(function () { self.setData({ cartBounce: false }) }, 300)
  },

  goCheckout: function () {
    if (this.data.totalPrice < this.data.minPrice) { wx.showToast({ title: '未达起送价', icon: 'none' }); return }
    wx.setStorageSync('checkoutItems', this.data.cart)
    wx.navigateTo({ url: '/pages/order/order' })
  },

  _dropBall: function () {
    var balls = this.data.balls
    var id = Date.now()
    balls.push({ id: id, x: 150, y: 300, show: true })
    this.setData({ balls: balls })
    var self = this
    setTimeout(function () {
      var bs = self.data.balls
      for (var i = 0; i < bs.length; i++) { if (bs[i].id === id) { bs[i].show = false; break } }
      self.setData({ balls: bs })
    }, 500)
  },

  _animating: false,
  _startBallAnim: function (startX, startY) {
    var self = this
    if (self._animating) return
    self._animating = true
    var duration = 400, startTime = 0
    var targetX = 50, targetY = 700
    var bezX = startX + 80, bezY = startY - 200
    function anim(ts) {
      if (!startTime) startTime = ts
      var t = Math.min((ts - startTime) / duration, 1)
      var u = 1 - t
      var x = u * u * startX + 2 * u * t * bezX + t * t * targetX
      var y = u * u * startY + 2 * u * t * bezY + t * t * targetY
      var scale = 1 - t * 0.3
      var o = 1 - t * 0.5
      var c = self.data._ball
      c.x = x; c.y = y; c.scale = scale; c.opacity = o; c.show = true
      self.setData({ _ball: c })
      if (t < 1) { wx.nextAnimationFrame ? wx.nextAnimationFrame(anim) : setTimeout(function () { anim(Date.now()) }, 16) }
      else { c.show = false; self.setData({ _ball: c }); self._animating = false }
    }
    anim(Date.now())
  },

  addToCartAnim: function (e) {
    var product = e.currentTarget.dataset.product
    var cart = this.data.cart, found = false
    for (var i = 0; i < cart.length; i++) { if (cart[i]._id === product._id) { cart[i].quantity++; found = true; break } }
    if (!found) cart.push({ _id: product._id, name: product.name, price: product.price, image: product.image, quantity: 1 })
    this._updateCart(cart)
    this._dropBall()
  },

  bindgetuserinfo: function (e) { if (e.detail.userInfo) wx.showToast({ title: '已授权', icon: 'success' }) },
  bindphonenumber: function (e) { if (e.detail.code) wx.showToast({ title: '已绑定', icon: 'success' }) },
  binderror: function (e) { console.warn('组件错误', e.detail) }
})
