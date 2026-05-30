// 商家订单管理
const db = wx.cloud.database()

Page({
  data: {
    orders: [],
    currentTab: 'all', // all, pending, delivering, completed
    loading: true,
    stats: {
      todayOrders: 0,
      todayIncome: 0
    }
  },

  onLoad: function () {
    this.getOrders()
    this.getStats()
  },

  onShow: function () {
    this.getOrders()
  },

  // 切换Tab
  switchTab: function (e) {
    const tab = e.currentTarget.dataset.tab
    this.setData({ currentTab: tab })
    this.getOrders()
  },

  // 获取订单列表
  getOrders: function () {
    this.setData({ loading: true })
    
    let query = db.collection('orders').orderBy('createTime', 'desc')
    
    if (this.data.currentTab !== 'all') {
      query = query.where({ status: this.data.currentTab })
    }
    
    query.limit(50).get().then(res => {
      const orders = res.data.map(order => ({
        ...order,
        statusText: this.getStatusText(order.status),
        statusClass: order.status,
        createTimeText: this.formatTime(order.createTime)
      }))
      this.setData({ orders, loading: false })
    }).catch(err => {
      console.error('获取订单失败', err)
      // 示例数据
      this.setData({
        orders: [
          {
            _id: '1',
            orderNo: '20260530001',
            items: [
              { name: '可口可乐 330ml', quantity: 2, price: 3.5 },
              { name: '奥利奥饼干 97g', quantity: 1, price: 8.9 }
            ],
            finalPrice: 15.9,
            address: { name: '张三', phone: '138****8888', community: '幸福小区', building: '3', unit: '2', room: '502' },
            status: 'pending',
            statusText: '待配送',
            statusClass: 'pending',
            createTimeText: '2026-05-30 14:30'
          },
          {
            _id: '2',
            orderNo: '20260530002',
            items: [
              { name: '农夫山泉 550ml', quantity: 6, price: 2.0 },
              { name: '红牛 250ml', quantity: 2, price: 6.0 }
            ],
            finalPrice: 24.0,
            address: { name: '李四', phone: '139****6666', community: '幸福小区', building: '5', unit: '1', room: '1001' },
            status: 'delivering',
            statusText: '配送中',
            statusClass: 'delivering',
            createTimeText: '2026-05-30 15:00'
          },
          {
            _id: '3',
            orderNo: '20260530003',
            items: [
              { name: '蒙牛纯牛奶 250ml', quantity: 4, price: 3.0 },
              { name: '舒肤佳香皂 115g', quantity: 1, price: 6.9 }
            ],
            finalPrice: 18.9,
            address: { name: '王五', phone: '137****5555', community: '幸福小区', building: '1', unit: '3', room: '801' },
            status: 'completed',
            statusText: '已完成',
            statusClass: 'completed',
            createTimeText: '2026-05-30 16:00'
          }
        ],
        loading: false
      })
    })
  },

  // 获取统计数据
  getStats: function () {
    // 这里简化处理
    this.setData({
      stats: {
        todayOrders: 12,
        todayIncome: 386
      }
    })
  },

  // 获取状态文本
  getStatusText: function (status) {
    const map = {
      'pending': '待配送',
      'delivering': '配送中',
      'completed': '已完成'
    }
    return map[status] || status
  },

  // 格式化时间
  formatTime: function (timestamp) {
    if (!timestamp) return ''
    const date = new Date(timestamp)
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const day = date.getDate().toString().padStart(2, '0')
    const hour = date.getHours().toString().padStart(2, '0')
    const minute = date.getMinutes().toString().padStart(2, '0')
    return `${month}-${day} ${hour}:${minute}`
  },

  // 开始配送
  startDelivery: function (e) {
    const orderId = e.currentTarget.dataset.id
    wx.showModal({
      title: '确认配送',
      content: '确认开始配送这个订单吗？',
      success: (res) => {
        if (res.confirm) {
          db.collection('orders').doc(orderId).update({
            data: {
              status: 'delivering',
              deliveryTime: db.serverDate()
            }
          }).then(() => {
            wx.showToast({ title: '已开始配送', icon: 'success' })
            this.getOrders()
          })
        }
      }
    })
  },

  // 完成配送
  completeDelivery: function (e) {
    const orderId = e.currentTarget.dataset.id
    wx.showModal({
      title: '确认送达',
      content: '确认订单已送达吗？',
      success: (res) => {
        if (res.confirm) {
          db.collection('orders').doc(orderId).update({
            data: {
              status: 'completed',
              completeTime: db.serverDate()
            }
          }).then(() => {
            wx.showToast({ title: '已完成', icon: 'success' })
            this.getOrders()
            this.getStats()
          })
        }
      }
    })
  },

  // 拨打电话
  callPhone: function (e) {
    const phone = e.currentTarget.dataset.phone
    wx.makePhoneCall({ phoneNumber: phone })
  },

  // 查看订单详情
  viewDetail: function (e) {
    const orderId = e.currentTarget.dataset.id
    wx.navigateTo({
      url: '/pages/admin/orders/detail?id=' + orderId
    })
  }
})
