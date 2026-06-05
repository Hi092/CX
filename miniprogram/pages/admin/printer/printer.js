// pages/admin/printer/printer.js
Page({
  data: {
    themeColor: '#4A90D9',
    printerEnabled: false,
    printerName: '',
    printerIp: '',
    printerPort: '9100',
    printerPaper: '80mm',
    printerCopies: 1,
    autoPrint: false,
    paperList: ['58mm', '80mm'],
    loading: false,
    testPrinting: false
  },

  onLoad: function () {
    this.loadData()
  },

  loadData: function () {
    var cached = wx.getStorageSync('shopSettings')
    if (cached) {
      this.setData({
        themeColor: cached.themeColor || '#4A90D9',
        printerEnabled: cached.printerEnabled || false,
        printerName: cached.printerName || '',
        printerIp: cached.printerIp || '',
        printerPort: cached.printerPort || '9100',
        printerPaper: cached.printerPaper || '80mm',
        printerCopies: cached.printerCopies || 1,
        autoPrint: cached.autoPrint || false
      })
    }
    var self = this
    wx.cloud.callFunction({
      name: 'getSettings',
      success: function (res) {
        if (res.result && res.result.success && res.result.data) {
          var d = res.result.data
          self.setData({
            printerEnabled: d.printerEnabled || false,
            printerName: d.printerName || '',
            printerIp: d.printerIp || '',
            printerPort: d.printerPort || '9100',
            printerPaper: d.printerPaper || '80mm',
            printerCopies: d.printerCopies || 1,
            autoPrint: d.autoPrint || false
          })
        }
      }
    })
  },

  goBack: function () { wx.navigateBack() },

  togglePrinter: function (e) { this.setData({ printerEnabled: e.detail.value }) },
  toggleAutoPrint: function (e) { this.setData({ autoPrint: e.detail.value }) },
  onPrinterNameInput: function (e) { this.setData({ printerName: e.detail.value }) },
  onPrinterIpInput: function (e) { this.setData({ printerIp: e.detail.value }) },
  onPrinterPortInput: function (e) { this.setData({ printerPort: e.detail.value }) },
  onPrinterCopiesInput: function (e) {
    var val = parseInt(e.detail.value) || 1
    if (val < 1) val = 1
    if (val > 5) val = 5
    this.setData({ printerCopies: val })
  },
  onPaperChange: function (e) { this.setData({ printerPaper: this.data.paperList[e.detail.value] }) },

  testPrint: function () {
    var d = this.data
    if (!d.printerIp) { wx.showToast({ title: '请先填写打印机IP', icon: 'none' }); return }
    if (!d.printerPort) { wx.showToast({ title: '请先填写端口号', icon: 'none' }); return }
    this.setData({ testPrinting: true })
    var self = this
    wx.cloud.callFunction({
      name: 'printOrder',
      data: { action: 'test', printerIp: d.printerIp, printerPort: parseInt(d.printerPort), printerPaper: d.printerPaper },
      success: function (res) {
        self.setData({ testPrinting: false })
        if (res.result && res.result.success) {
          wx.showToast({ title: '测试打印已发送', icon: 'success' })
        } else {
          wx.showModal({ title: '打印失败', content: '无法连接打印机，请检查IP和端口是否正确', showCancel: false })
        }
      },
      fail: function () {
        self.setData({ testPrinting: false })
        wx.showModal({ title: '打印失败', content: '网络错误，请检查打印机IP和WiFi网络', showCancel: false })
      }
    })
  },

  saveSettings: function () {
    this.setData({ loading: true })
    var cached = wx.getStorageSync('shopSettings') || {}
    var printerData = {
      printerEnabled: this.data.printerEnabled,
      printerName: this.data.printerName,
      printerIp: this.data.printerIp,
      printerPort: this.data.printerPort,
      printerPaper: this.data.printerPaper,
      printerCopies: this.data.printerCopies,
      autoPrint: this.data.autoPrint
    }
    for (var k in printerData) { cached[k] = printerData[k] }
    wx.setStorageSync('shopSettings', cached)

    var self = this
    wx.cloud.callFunction({
      name: 'updateSettings',
      data: { data: printerData },
      success: function () {
        self.setData({ loading: false })
        wx.showToast({ title: '保存成功', icon: 'success' })
        setTimeout(function () { wx.navigateBack() }, 1000)
      },
      fail: function () {
        self.setData({ loading: false })
        wx.showToast({ title: '保存失败，请重试', icon: 'none' })
      }
    })
  }
})
