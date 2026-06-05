// 分类页面（默认启动页）
var db = wx.cloud.database()

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
    var self = this
    this.calcCart()
    this.updateCartBadge()
    var s = wx.getStorageSync('shopSettings')
    if (s) {
      if (s.themeColor) self.setData({ themeColor: s.themeColor })
      if (s.shopName) self.setData({ shopName: s.shopName })
      if (s.shopAvatar !== undefined) self.setData({ shopAvatar: s.shopAvatar || '' })
      if (s.shopStatus) self.setData({ shopStatus: s.shopStatus })
      if (s.shopPhone) self.setData({ shopPhone: s.shopPhone })
    }
    // 每次显示都清缓存重新拉，保证商家改完商品/分类立刻生效
    wx.removeStorageSync('productsCache')
    self.loadShopInfo()
    self.loadProducts()
  },

  loadShopInfo: function () {
    var self = this
    var _applySettings = function (data) {
      if (!data) return
      var cats = data.categories || ['饮料', '零食', '方便面', '日用品', '烟酒', '文具', '生鲜']
      var list = [{ id: 0, name: '全部' }]
      for (var i = 0; i < cats.length; i++) {
        list.push({ id: i + 1, name: cats[i] })
      }
      var tc = data.themeColor || '#4A90D9'
      self.setData({
        shopName: data.shopName || '邻里优选',
        shopAvatar: data.shopAvatar || data.bannerUrl || '',
        shopStatus: data.shopStatus || '营业中',
        shopPhone: data.shopPhone || '',
        themeColor: tc,
        minPrice: data.minPrice || 20,
        deliveryFee: data.deliveryFee || 3,
        freeDeliveryPrice: data.freeDeliveryPrice || 30,
        categories: list
      })
      wx.setStorageSync('shopSettings', {
        minPrice: data.minPrice || 20,
        deliveryFee: data.deliveryFee || 3,
        freeDeliveryPrice: data.freeDeliveryPrice || 30,
        themeColor: tc,
        shopAvatar: data.shopAvatar || data.bannerUrl || '',
        shopStatus: data.shopStatus || '营业中',
        shopName: data.shopName || '邻里优选',
        shopPhone: data.shopPhone || ''
      })
    }
    // 云函数读（管理员权限，所有用户可用）
    wx.cloud.callFunction({
      name: 'getSettings',
      success: function (res) {
        if (res.result && res.result.success && res.result.data) {
          _applySettings(res.result.data)
        } else {
          // 降级：客户端直读
          db.collection('settings').doc('shop').get().then(function (r) {
            _applySettings(r.data)
          }).catch(function () {})
        }
      },
      fail: function () {
        // 降级：客户端直读
        db.collection('settings').doc('shop').get().then(function (r) {
          _applySettings(r.data)
        }).catch(function () {
          self.setData({
            categories: [
              { id: 0, name: '全部' },
              { id: 1, name: '饮料' }, { id: 2, name: '零食' },
              { id: 3, name: '方便面' }, { id: 4, name: '日用品' },
              { id: 5, name: '烟酒' }, { id: 6, name: '文具' },
              { id: 7, name: '生鲜' }
            ]
          })
        })
      }
    })
  },

  loadProducts: function () {
    var self = this
    wx.showLoading({ title: '加载中' })
    wx.cloud.callFunction({
      name: 'getProducts',
      success: function (res) {
        var list = (res.result && res.result.data) ? res.result.data : []
        self.setData({ allProducts: list })
        wx.setStorageSync('productsCache', { data: list, time: Date.now() })
        self.filterProducts()
        wx.hideLoading()
      },
      fail: function (err) {
        console.error('getProducts失败', err)
        // 降级：客户端直读（管理员账号能读到）
        db.collection('products').limit(100).get().then(function (res) {
          self.setData({ allProducts: res.data })
          self.filterProducts()
          wx.hideLoading()
        }).catch(function () {
          wx.hideLoading()
        })
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
        if (p.name.toLowerCase().indexOf(searchKey.toLowerCase()) === -1) match = false
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
    if (idx > -1) { cart[idx].quantity++ }
    else { cart.push({ _id: product._id, name: product.name, price: Math.round(product.price * 100) / 100, image: product.image, quantity: 1 }) }
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
    // 每次打开弹窗都从storage读最新数据，保证商品列表一定有
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

  closeCartPopup: function () {
    this.setData({ showCartPopup: false })
  },

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
    if (cart[index].quantity <= 1) {
      cart.splice(index, 1)
    } else {
      cart[index].quantity--
    }
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
    wx.removeStorageSync('productsCache')
    this.loadProducts()
    wx.stopPullDownRefresh()
  }
})
