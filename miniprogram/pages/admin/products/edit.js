// 商品编辑页 - 修改价格等
Page({
  data: {
    isEdit: false,
    id: '',
    name: '',
    price: '',
    stock: '',
    category: '',
    description: '',
    image: '',
    imageChanged: false,
    categories: [],
    loading: false
  },

  onLoad: function (options) {
    var self = this
    if (options.id) {
      self.setData({ isEdit: true, id: options.id })
      wx.cloud.database().collection('products').doc(options.id).get().then(function (res) {
        var p = res.data || {}
        self.setData({
          name: p.name || '',
          price: p.price !== undefined ? String(p.price) : '',
          stock: p.stock !== undefined ? String(p.stock) : '',
          category: p.category || '',
          description: p.description || '',
          image: p.image || ''
        })
      }).catch(function () {
        wx.showToast({ title: '商品不存在', icon: 'none' })
      })
    }
    self.loadCategories()
  },

  loadCategories: function () {
    var self = this
    wx.cloud.callFunction({ name: 'getSettings' }).then(function (res) {
      var result = res.result || {}
      var cats = result.data && result.data.categories ? result.data.categories : result.categories
      self.setData({ categories: cats || ['饮料', '零食', '方便面', '日用品', '烟酒', '文具', '生鲜'] })
    }).catch(function () {
      self.setData({ categories: ['饮料', '零食', '方便面', '日用品', '烟酒', '文具', '生鲜'] })
    })
  },

  chooseImage: function () {
    var self = this
    wx.chooseMedia({ count: 1, mediaType: ['image'], sourceType: ['album', 'camera'] }).then(function (res) {
      self.setData({ image: res.tempFiles[0].tempFilePath, imageChanged: true })
    }).catch(function () {})
  },

  onNameInput: function (e) { this.setData({ name: e.detail.value }) },
  onPriceInput: function (e) { this.setData({ price: e.detail.value }) },
  onStockInput: function (e) { this.setData({ stock: e.detail.value }) },
  onCategoryChange: function (e) { this.setData({ category: this.data.categories[e.detail.value] }) },
  onDescInput: function (e) { this.setData({ description: e.detail.value }) },

  saveProduct: function () {
    var self = this
    var data = self.data
    if (!data.name.trim()) { wx.showToast({ title: '请输入商品名称', icon: 'none' }); return }
    if (!data.price || isNaN(parseFloat(data.price))) { wx.showToast({ title: '请输入正确价格', icon: 'none' }); return }
    if (!data.category) { wx.showToast({ title: '请选择分类', icon: 'none' }); return }

    self.setData({ loading: true })

    var upload = Promise.resolve(data.image || '')
    if (data.image && data.imageChanged) {
      upload = self.uploadImage(data.image)
    }

    upload.then(function (imageUrl) {
      var db = wx.cloud.database()
      var productData = {
        name: data.name, price: parseFloat(data.price), stock: parseInt(data.stock) || 0,
        category: data.category, description: data.description || '', image: imageUrl
      }
      if (data.isEdit) {
        // 走云函数绕过权限
        wx.cloud.callFunction({
          name: 'manageProduct',
          data: { action: 'update', id: data.id, data: productData }
        }).then(function (res) {
          var result = res.result || {}
          wx.removeStorageSync('productsCache')
          self.setData({ loading: false })
          if (result.success) {
            wx.showToast({ title: '保存成功', icon: 'success' })
            setTimeout(function () { wx.navigateBack() }, 1500)
          } else {
            wx.showToast({ title: result.error || '保存失败', icon: 'none' })
          }
        }).catch(function (err) {
          console.error('云函数保存失败', err)
          self.setData({ loading: false })
          wx.showToast({ title: '保存失败，请重试', icon: 'none' })
        })
      } else {
        productData.status = 'on'
        productData.sales = 0
        wx.cloud.callFunction({
          name: 'manageProduct',
          data: { action: 'create', data: productData }
        }).then(function (res) {
          var result = res.result || {}
          wx.removeStorageSync('productsCache')
          self.setData({ loading: false })
          if (result.success) {
            wx.showToast({ title: '添加成功', icon: 'success' })
            setTimeout(function () { wx.navigateBack() }, 1500)
          } else {
            wx.showToast({ title: result.error || '添加失败', icon: 'none' })
          }
        }).catch(function (err) {
          console.error('云函数添加失败', err)
          self.setData({ loading: false })
          wx.showToast({ title: '添加失败，请重试', icon: 'none' })
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
