// 销售统计页面
var db = wx.cloud.database()
var _ = db.command

Page({
  data: {
    themeColor: '#4A90D9',
    dateRange: 'today',
    dateRangeList: [
      { key: 'today', name: '今日' },
      { key: 'week', name: '本周' },
      { key: 'month', name: '本月' }
    ],
    loading: false,
    // 统计数据
    totalOrders: 0,
    totalIncome: '0.00',
    avgOrderPrice: '0.00',
    completedOrders: 0,
    cancelledOrders: 0,
    // 趋势数据
    trendData: [],
    trendMax: 0,
    trendLabels: [],
    // 热销商品
    topProducts: [],
    // 时段分布
    hourData: [],
    hourMax: 0
  },

  onLoad: function () {
    var s = wx.getStorageSync('shopSettings')
    if (s && s.themeColor) this.setData({ themeColor: s.themeColor })
    this.loadStats()
  },

  onShow: function () {
    this.loadStats()
  },

  switchDateRange: function (e) {
    var range = e.currentTarget.dataset.range
    this.setData({ dateRange: range })
    this.loadStats()
  },

  getDateRange: function () {
    var now = new Date()
    var y = now.getFullYear()
    var m = now.getMonth()
    var d = now.getDate()
    var range = this.data.dateRange

    var start = new Date(y, m, d)
    var end = new Date(y, m, d + 1)

    if (range === 'week') {
      var dayOfWeek = now.getDay()
      if (dayOfWeek === 0) dayOfWeek = 7
      start = new Date(y, m, d - dayOfWeek + 1)
      end = new Date(y, m, d + 1)
    } else if (range === 'month') {
      start = new Date(y, m, 1)
      end = new Date(y, m + 1, 1)
    }

    return { start: start, end: end }
  },

  loadStats: function () {
    var self = this
    self.setData({ loading: true })
    var range = self.getDateRange()
    var startTime = range.start.getTime()
    var endTime = range.end.getTime()

    // 查询所有有效订单
    db.collection('orders')
      .where({ status: _.in(['paid', 'delivering', 'completed']) })
      .orderBy('createTime', 'desc')
      .limit(500)
      .get()
      .then(function (res) {
        var orders = res.data || []
        var filtered = []
        for (var i = 0; i < orders.length; i++) {
          var ct = self.toDate(orders[i].createTime)
          if (ct && ct.getTime() >= startTime && ct.getTime() < endTime) {
            filtered.push(orders[i])
          }
        }
        self.processStats(filtered)
      })
      .catch(function (err) {
        console.error('加载统计失败', err)
        self.setData({ loading: false })
      })
  },

  processStats: function (orders) {
    var totalIncome = 0
    var completedOrders = 0
    var cancelledOrders = 0
    var productSales = {}
    var hourBuckets = {}
    var dayBuckets = {}

    for (var i = 0; i < 24; i++) hourBuckets[i] = 0

    for (var j = 0; j < orders.length; j++) {
      var order = orders[j]
      var price = order.finalPrice || order.totalPrice || 0
      totalIncome += price

      if (order.status === 'completed') completedOrders++

      // 时段分布
      var ct = this.toDate(order.createTime)
      if (ct) {
        var hour = ct.getHours()
        hourBuckets[hour] = (hourBuckets[hour] || 0) + 1

        // 日趋势
        var dayKey = (ct.getMonth() + 1) + '/' + ct.getDate()
        if (!dayBuckets[dayKey]) dayBuckets[dayKey] = { income: 0, count: 0 }
        dayBuckets[dayKey].income += price
        dayBuckets[dayKey].count++
      }

      // 热销商品
      var items = order.items || []
      for (var k = 0; k < items.length; k++) {
        var item = items[k]
        var pid = item.productId || item.name
        if (!productSales[pid]) productSales[pid] = { name: item.name, quantity: 0, income: 0 }
        productSales[pid].quantity += item.quantity || 1
        productSales[pid].income += (item.price || 0) * (item.quantity || 1)
      }
    }

    // 处理趋势数据
    var trendData = []
    var trendLabels = []
    var trendMax = 0
    var range = this.data.dateRange

    if (range === 'today') {
      // 按小时
      for (var h = 8; h <= 23; h++) {
        var count = hourBuckets[h] || 0
        trendData.push(count)
        trendLabels.push(h + ':00')
        if (count > trendMax) trendMax = count
      }
    } else {
      // 按天
      var keys = Object.keys(dayBuckets).sort()
      for (var d = 0; d < keys.length; d++) {
        var dayData = dayBuckets[keys[d]]
        trendData.push(Math.round(dayData.income * 100) / 100)
        trendLabels.push(keys[d])
        if (dayData.income > trendMax) trendMax = dayData.income
      }
    }

    // 处理热销商品
    var topProducts = []
    for (var pid in productSales) {
      topProducts.push(productSales[pid])
    }
    topProducts.sort(function (a, b) { return b.quantity - a.quantity })
    topProducts = topProducts.slice(0, 10)
    var maxQty = topProducts.length > 0 ? topProducts[0].quantity : 1

    // 处理时段分布
    var hourData = []
    var hourMax = 0
    for (var hr = 8; hr <= 23; hr++) {
      var cnt = hourBuckets[hr] || 0
      hourData.push({ hour: hr + ':00', count: cnt })
      if (cnt > hourMax) hourMax = cnt
    }

    this.setData({
      totalOrders: orders.length,
      totalIncome: totalIncome.toFixed(2),
      avgOrderPrice: orders.length > 0 ? (totalIncome / orders.length).toFixed(2) : '0.00',
      completedOrders: completedOrders,
      cancelledOrders: cancelledOrders,
      trendData: trendData,
      trendLabels: trendLabels,
      trendMax: trendMax || 1,
      topProducts: topProducts,
      maxQty: maxQty || 1,
      hourData: hourData,
      hourMax: hourMax || 1,
      loading: false
    })
  },

  toDate: function (timestamp) {
    if (!timestamp) return null
    if (typeof timestamp === 'object' && timestamp.$date) return new Date(timestamp.$date)
    return new Date(timestamp)
  },

  getBarHeight: function (value, max) {
    if (!max || max === 0) return 0
    return Math.round((value / max) * 200)
  }
})
