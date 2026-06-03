// 分类页面（默认启动页）
var db = wx.cloud.database()

Page({
  data: {
    shopName: '邻里优选',
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
    var s = wx.getStorageSync('shopSettings')
    if (s) {
      if (s.themeColor) this.setData({ themeColor: s.themeColor })
      if (s.shopName) this.setData({ shopName: s.shopName })
      if (s.shopPhone) this.setData({ shopPhone: s.shopPhone })
    }
  },

  loadShopInfo: function () {
    var self = this
    db.collection('settings').doc('shop').get().then(function (res) {
      if (res.data) {
        var cats = res.data.categories || ['饮料', '零食', '方便面', '日用品', '烟酒', '文具', '生鲜']
        var list = [{ id: 0, name: '全部' }]
        for (var i = 0; i < cats.length; i++) {
          list.push({ id: i + 1, name: cats[i] })
        }
        var tc = res.data.themeColor || '#4A90D9'
        self.setData({
          shopName: res.data.shopName || '邻里优选',
          shopPhone: res.data.shopPhone || '',
          themeColor: tc,
          minPrice: res.data.minPrice || 20,
          deliveryFee: res.data.deliveryFee || 3,
          freeDeliveryPrice: res.data.freeDeliveryPrice || 30,
          categories: list
        })
        wx.setStorageSync('shopSettings', {
          minPrice: res.data.minPrice || 20,
          deliveryFee: res.data.deliveryFee || 3,
          freeDeliveryPrice: res.data.freeDeliveryPrice || 30,
          themeColor: tc,
          bannerUrl: res.data.bannerUrl || '',
          bannerText: res.data.bannerText || '邻里优选 · 新鲜送到家',
          shopName: res.data.shopName || '邻里优选',
          shopPhone: res.data.shopPhone || ''
        })
      }
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
  },

  loadProducts: function () {
    var self = this
    var cache = wx.getStorageSync('productsCache')
    if (cache && cache.data && cache.time > Date.now() - 300000) {
      self.setData({ allProducts: cache.data })
      self.filterProducts()
    } else {
      wx.showLoading({ title: '加载中' })
      db.collection('products').limit(100).get().then(function (res) {
        self.setData({ allProducts: res.data })
        wx.setStorageSync('productsCache', { data: res.data, time: Date.now() })
        self.filterProducts()
        wx.hideLoading()
      }).catch(function (err) {
        console.error(err)
        wx.hideLoading()
      })
    }
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
    else { cart.push({ _id: product._id, name: product.name, price: product.price, image: product.image, quantity: 1 }) }
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
      totalPrice += cart[i].price * cart[i].quantity
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

  // 弹出购物车弹窗
  toggleCartPopup: function () {
    if (this.data.totalCount === 0) {
      wx.showToast({ title: '购物车是空的', icon: 'none' })
      return
    }
    this.setData({ showCartPopup: !this.data.showCartPopup })
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

  // 弹窗内加减
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

  // 弹窗去结算
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
