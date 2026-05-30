// 购物车页面
Page({
  data: {
    cart: [],
    totalPrice: 0,
    totalCount: 0,
    selectAll: true
  },

  onShow: function () {
    this.loadCart()
  },

  // 加载购物车
  loadCart: function () {
    let cart = wx.getStorageSync('cart') || []
    cart = cart.map(item => ({
      ...item,
      selected: true
    }))
    this.setData({ cart })
    this.calcTotal()
  },

  // 计算总价
  calcTotal: function () {
    const { cart } = this.data
    let totalPrice = 0
    let totalCount = 0
    let selectAll = true

    cart.forEach(item => {
      if (item.selected) {
        totalPrice += item.price * item.quantity
        totalCount += item.quantity
      } else {
        selectAll = false
      }
    })

    this.setData({
      totalPrice: totalPrice.toFixed(2),
      totalCount,
      selectAll: cart.length > 0 ? selectAll : false
    })
  },

  // 选择/取消选择
  toggleSelect: function (e) {
    const index = e.currentTarget.dataset.index
    const key = `cart[${index}].selected`
    this.setData({
      [key]: !this.data.cart[index].selected
    })
    this.calcTotal()
    this.saveCart()
  },

  // 全选/取消全选
  toggleSelectAll: function () {
    const selectAll = !this.data.selectAll
    const cart = this.data.cart.map(item => ({
      ...item,
      selected: selectAll
    }))
    this.setData({ cart, selectAll })
    this.calcTotal()
    this.saveCart()
  },

  // 减少数量
  decrease: function (e) {
    const index = e.currentTarget.dataset.index
    const cart = this.data.cart
    if (cart[index].quantity <= 1) {
      wx.showModal({
        title: '提示',
        content: '确定要删除这个商品吗？',
        success: (res) => {
          if (res.confirm) {
            cart.splice(index, 1)
            this.setData({ cart })
            this.calcTotal()
            this.saveCart()
          }
        }
      })
    } else {
      const key = `cart[${index}].quantity`
      this.setData({
        [key]: cart[index].quantity - 1
      })
      this.calcTotal()
      this.saveCart()
    }
  },

  // 增加数量
  increase: function (e) {
    const index = e.currentTarget.dataset.index
    const key = `cart[${index}].quantity`
    this.setData({
      [key]: this.data.cart[index].quantity + 1
    })
    this.calcTotal()
    this.saveCart()
  },

  // 保存购物车
  saveCart: function () {
    wx.setStorageSync('cart', this.data.cart)
    this.updateCartBadge()
  },

  // 更新角标
  updateCartBadge: function () {
    const count = this.data.cart.reduce((sum, item) => sum + item.quantity, 0)
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
  },

  // 清空购物车
  clearCart: function () {
    wx.showModal({
      title: '提示',
      content: '确定要清空购物车吗？',
      success: (res) => {
        if (res.confirm) {
          this.setData({ cart: [] })
          this.calcTotal()
          wx.removeStorageSync('cart')
          this.updateCartBadge()
        }
      }
    })
  },

  // 去结算
  checkout: function () {
    const { cart, totalCount } = this.data
    const selectedItems = cart.filter(item => item.selected)
    
    if (selectedItems.length === 0) {
      wx.showToast({
        title: '请选择商品',
        icon: 'none'
      })
      return
    }

    // 检查起送价
    const minPrice = 20 // 起送价20元
    if (this.data.totalPrice < minPrice) {
      wx.showToast({
        title: `满${minPrice}元起送`,
        icon: 'none'
      })
      return
    }

    // 保存选中的商品到下单缓存
    wx.setStorageSync('checkoutItems', selectedItems)
    
    wx.navigateTo({
      url: '/pages/order/order'
    })
  }
})
