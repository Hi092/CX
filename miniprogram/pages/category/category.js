// 分类页面
const db = wx.cloud.database()

Page({
  data: {
    categories: [
      { id: 1, name: '饮料', icon: '🥤' },
      { id: 2, name: '零食', icon: '🍪' },
      { id: 3, name: '方便面', icon: '🍜' },
      { id: 4, name: '日用品', icon: '🧴' },
      { id: 5, name: '烟酒', icon: '🚬' },
      { id: 6, name: '文具', icon: '✏️' },
      { id: 7, name: '生鲜', icon: '🥬' }
    ],
    currentCategory: 0,
    products: [],
    loading: false,
    searchKey: ''
  },

  onLoad: function (options) {
    if (options.focus) {
      // 聚焦搜索框
    }
    this.getProducts()
  },

  onShow: function () {
    this.updateCartBadge()
  },

  // 切换分类
  switchCategory: function (e) {
    const index = e.currentTarget.dataset.index
    this.setData({ currentCategory: index })
    this.getProducts()
  },

  // 获取商品
  getProducts: function () {
    this.setData({ loading: true })
    
    const category = this.data.categories[this.data.currentCategory].name
    
    db.collection('products')
      .where({
        status: 'on',
        category: category
      })
      .orderBy('sales', 'desc')
      .limit(50)
      .get()
      .then(res => {
        this.setData({
          products: res.data,
          loading: false
        })
      })
      .catch(err => {
        console.error('获取商品失败', err)
        // 示例数据
        this.setData({
          products: [
            { _id: '1', name: '可口可乐 330ml', price: 3.5, image: '/images/product1.png', description: '经典口味，清爽解渴' },
            { _id: '2', name: '农夫山泉 550ml', price: 2.0, image: '/images/product5.png', description: '天然矿泉水' },
            { _id: '3', name: '红牛 250ml', price: 6.0, image: '/images/product6.png', description: '提神抗疲劳' },
            { _id: '4', name: '蒙牛纯牛奶 250ml', price: 3.0, image: '/images/product7.png', description: '新鲜营养' }
          ],
          loading: false
        })
      })
  },

  // 搜索
  onSearch: function (e) {
    this.setData({ searchKey: e.detail.value })
    if (e.detail.value) {
      this.searchProducts(e.detail.value)
    } else {
      this.getProducts()
    }
  },

  // 搜索商品
  searchProducts: function (keyword) {
    this.setData({ loading: true })
    
    db.collection('products')
      .where({
        status: 'on',
        name: db.RegExp({
          regexp: keyword,
          options: 'i'
        })
      })
      .limit(50)
      .get()
      .then(res => {
        this.setData({
          products: res.data,
          loading: false
        })
      })
  },

  // 跳转详情
  goDetail: function (e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: '/pages/order/detail?id=' + id
    })
  },

  // 加入购物车
  addToCart: function (e) {
    const product = e.currentTarget.dataset.product
    let cart = wx.getStorageSync('cart') || []
    
    const index = cart.findIndex(item => item._id === product._id)
    if (index > -1) {
      cart[index].quantity++
    } else {
      cart.push({
        _id: product._id,
        name: product.name,
        price: product.price,
        image: product.image,
        quantity: 1
      })
    }
    
    wx.setStorageSync('cart', cart)
    this.updateCartBadge()
    
    wx.showToast({
      title: '已加入购物车',
      icon: 'success'
    })
  },

  // 更新购物车角标
  updateCartBadge: function () {
    const cart = wx.getStorageSync('cart') || []
    const count = cart.reduce((sum, item) => sum + item.quantity, 0)
    if (count > 0) {
      wx.setTabBarBadge({
        index: 2,
        text: count.toString()
      })
    } else {
      wx.removeTabBarBadge({
        index: 2
      })
    }
  }
})
