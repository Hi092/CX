var db = wx.cloud.database()
var CONFIG_DOC_ID = 'shop_config_v1'
var DEFAULT_CATEGORIES = ['饮料', '零食', '方便面', '日用品', '烟酒', '文具', '生鲜']

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
    categories: [],
    categoryIndex: 0,
    loading: false,
    themeColor: '#4A90D9'
  },

  onLoad: function (options) {
    var s = wx.getStorageSync('shopSettings') || {}
    if (s.themeColor) this.setData({ themeColor: s.themeColor })
    var cachedCats = wx.getStorageSync('shopCategories') || s.categories
    if (cachedCats && cachedCats.length > 0) this.applyCategories(cachedCats)
    else this.applyCategories(DEFAULT_CATEGORIES)
    this.loadCategories()
    if (options.id) {
      this.setData({ id: options.id, isEdit: true })
      wx.setNavigationBarTitle({ title: '编辑商品' })
      this.getProduct(options.id)
    } else {
      wx.setNavigationBarTitle({ title: '添加商品' })
    }
  },

  isArray: function (v) {
    return Object.prototype.toString.call(v) === '[object Array]'
  },

  applyCategories: function (cats) {
    if (!this.isArray(cats) || cats.length === 0) cats = DEFAULT_CATEGORIES
    this.setData({ categories: cats })
    wx.setStorageSync('shopCategories', cats)
    var s = wx.getStorageSync('shopSettings') || {}
    s.categories = cats
    wx.setStorageSync('shopSettings', s)
    if (this.data.category) {
      var idx = cats.indexOf(this.data.category)
      if (idx > -1) this.setData({ categoryIndex: idx })
    }
  },

  loadCategories: function () {
    var self = this
    db.collection('products').doc(CONFIG_DOC_ID).get().then(function (res) {
      if (res.data && self.isArray(res.data.categories)) {
        self.applyCategories(res.data.categories)
      } else {
        self.loadCategoriesFromCloud()
      }
    }).catch(function () {
      self.loadCategoriesFromCloud()
    })
  },

  loadCategoriesFromCloud: function () {
    var self = this
    wx.cloud.callFunction({
      name: 'getSettings',
      success: function (res) {
        var data = res.result && res.result.data
        if (data && self.isArray(data.categories)) self.applyCategories(data.categories)
      },
      fail: function () {}
    })
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
          wx.removeStorageSync('productsCache')
          self.setData({ loading: false })
          wx.showToast({ title: '保存成功', icon: 'success' })
          setTimeout(function () { wx.navigateBack() }, 1500)
        }).catch(function () {
          self.setData({ loading: false })
          wx.showToast({ title: '保存失败', icon: 'none' })
        })
      } else {
        productData.createTime = db.serverDate()
        productData.status = 'on'
        productData.sales = 0
        db.collection('products').add({ data: productData }).then(function () {
          wx.removeStorageSync('productsCache')
          self.setData({ loading: false })
          wx.showToast({ title: '添加成功', icon: 'success' })
          setTimeout(function () { wx.navigateBack() }, 1500)
        }).catch(function () {
          self.setData({ loading: false })
          wx.showToast({ title: '添加失败', icon: 'none' })
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
