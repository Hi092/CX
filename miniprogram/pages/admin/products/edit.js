// 商品编辑页面
var db = wx.cloud.database()

Page({
  data: {
    id: '',
    isEdit: false,
    name: '',
    price: '',
    stock: '',
    category: '',
    description: '',
    image: '',
    categories: ['饮料', '零食', '方便面', '日用品', '烟酒', '文具', '生鲜'],
    categoryIndex: 0,
    loading: false,
    themeColor: '#4A90D9'
  },

  onLoad: function (options) {
    var s = wx.getStorageSync('shopSettings')
    if (s && s.themeColor) this.setData({ themeColor: s.themeColor })
    if (options.id) {
      this.setData({ id: options.id, isEdit: true })
      wx.setNavigationBarTitle({ title: '编辑商品' })
      this.getProduct(options.id)
    } else {
      wx.setNavigationBarTitle({ title: '添加商品' })
    }
  },

  getProduct: function (id) {
    var self = this
    db.collection('products').doc(id).get().then(function (res) {
      var product = res.data
      var categoryIndex = self.data.categories.indexOf(product.category)
      self.setData({
        name: product.name,
        price: product.price.toString(),
        stock: product.stock.toString(),
        category: product.category,
        categoryIndex: categoryIndex > -1 ? categoryIndex : 0,
        description: product.description || '',
        image: product.image || ''
      })
    })
  },

  chooseImage: function () {
    var self = this
    wx.chooseImage({
      count: 1, sizeType: ['compressed'], sourceType: ['album', 'camera'],
      success: function (res) { self.setData({ image: res.tempFilePaths[0] }) }
    })
  },

  onNameInput: function (e) { this.setData({ name: e.detail.value }) },
  onPriceInput: function (e) { this.setData({ price: e.detail.value }) },
  onStockInput: function (e) { this.setData({ stock: e.detail.value }) },

  onCategoryChange: function (e) {
    var index = e.detail.value
    this.setData({ categoryIndex: index, category: this.data.categories[index] })
  },

  onDescInput: function (e) { this.setData({ description: e.detail.value }) },

  saveProduct: function () {
    var data = this.data
    if (!data.name) { wx.showToast({ title: '请输入商品名称', icon: 'none' }); return }
    if (!data.price || isNaN(data.price)) { wx.showToast({ title: '请输入正确的价格', icon: 'none' }); return }
    if (!data.stock || isNaN(data.stock)) { wx.showToast({ title: '请输入正确的库存', icon: 'none' }); return }
    if (!data.category) { wx.showToast({ title: '请选择分类', icon: 'none' }); return }

    this.setData({ loading: true })
    var self = this
    var uploadTask = data.image ? this.uploadImage(data.image) : Promise.resolve('')

    uploadTask.then(function (imageUrl) {
      var productData = {
        name: data.name, price: parseFloat(data.price), stock: parseInt(data.stock),
        category: data.category, description: data.description, image: imageUrl,
        updateTime: db.serverDate()
      }
      if (data.isEdit) {
        db.collection('products').doc(data.id).update({ data: productData }).then(function () {
          wx.showToast({ title: '保存成功', icon: 'success' })
          setTimeout(function () { wx.navigateBack() }, 1500)
        })
      } else {
        productData.createTime = db.serverDate()
        productData.status = 'on'
        productData.sales = 0
        db.collection('products').add({ data: productData }).then(function () {
          wx.showToast({ title: '添加成功', icon: 'success' })
          setTimeout(function () { wx.navigateBack() }, 1500)
        })
      }
    }).catch(function (err) {
      console.error('保存失败', err)
      wx.showToast({ title: '保存失败', icon: 'none' })
      self.setData({ loading: false })
    })
  },

  uploadImage: function (filePath) {
    return wx.cloud.uploadFile({
      cloudPath: 'products/' + Date.now() + '-' + Math.random().toString(36).substr(2) + '.jpg',
      filePath: filePath
    }).then(function (res) { return res.fileID })
  }
})
