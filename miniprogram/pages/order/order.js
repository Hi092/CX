// 订单确认页
const db = wx.cloud.database()

Page({
  data: {
    items: [],
    totalPrice: 0,
    deliveryFee: 2,
    address: null,
    remark: '',
    loading: false
  },

  onLoad: function () {
    // 获取待结算商品
    const items = wx.getStorageSync('checkoutItems') || []
    const totalPrice = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
    
    this.setData({
      items,
      totalPrice: totalPrice.toFixed(2)
    })
    
    // 获取默认地址
    this.getAddress()
  },

  // 获取收货地址
  getAddress: function () {
    const address = wx.getStorageSync('defaultAddress')
    if (address) {
      this.setData({ address })
    }
  },

  // 选择地址
  chooseAddress: function () {
    wx.navigateTo({
      url: '/pages/my/address'
    })
  },

  // 输入备注
  onRemarkInput: function (e) {
    this.setData({ remark: e.detail.value })
  },

  // 提交订单
  submitOrder: function () {
    const { items, totalPrice, deliveryFee, address, remark } = this.data
    
    if (!address) {
      wx.showToast({
        title: '请选择收货地址',
        icon: 'none'
      })
      return
    }

    this.setData({ loading: true })

    // 计算最终价格（满20免配送费）
    const finalPrice = parseFloat(totalPrice) >= 20 ? parseFloat(totalPrice) : parseFloat(totalPrice) + deliveryFee

    // 创建订单
    const order = {
      items: items.map(item => ({
        productId: item._id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        image: item.image
      })),
      totalPrice: parseFloat(totalPrice),
      deliveryFee: parseFloat(totalPrice) >= 20 ? 0 : deliveryFee,
      finalPrice: finalPrice,
      address: address,
      remark: remark,
      status: 'pending', // pending待配送, delivering配送中, completed已完成
      createTime: db.serverDate()
    }

    // 保存到云数据库
    db.collection('orders').add({
      data: order
    }).then(res => {
      // 清空购物车中已购买的商品
      let cart = wx.getStorageSync('cart') || []
      const boughtIds = items.map(item => item._id)
      cart = cart.filter(item => !boughtIds.includes(item._id))
      wx.setStorageSync('cart', cart)
      wx.removeStorageSync('checkoutItems')

      // 跳转支付（这里用模拟支付）
      this.simulatePay(res._id, finalPrice)
    }).catch(err => {
      console.error('创建订单失败', err)
      wx.showToast({
        title: '下单失败，请重试',
        icon: 'none'
      })
      this.setData({ loading: false })
    })
  },

  // 模拟支付（真实环境替换为微信支付）
  simulatePay: function (orderId, price) {
    wx.showModal({
      title: '模拟支付',
      content: `订单金额: ¥${price.toFixed(2)}\n\n（这是demo版本，点击确定模拟支付成功）`,
      confirmText: '确认支付',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          // 更新订单状态为已支付
          db.collection('orders').doc(orderId).update({
            data: {
              status: 'paid',
              payTime: db.serverDate()
            }
          }).then(() => {
            wx.showToast({
              title: '支付成功',
              icon: 'success'
            })
            // 跳转到订单列表
            wx.switchTab({
              url: '/pages/my/my'
            })
          })
        } else {
          // 取消支付，订单保留待付款状态
          wx.showToast({
            title: '订单已保存',
            icon: 'none'
          })
          wx.switchTab({
            url: '/pages/my/my'
          })
        }
        this.setData({ loading: false })
      }
    })
  }
})
