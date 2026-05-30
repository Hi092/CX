// 商品编辑页面
const db = wx.cloud.database()

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
    loading: false
  },

  onLoad: function (options) {
    if (options.id) {
      this.setData({ id: options.id, isEdit: true })
      wx.setNavigationBarTitle({ title: '编辑商品' })
      this.getProduct(options.id)
    } else {
      wx.setNavigationBarTitle({ title: '添加商品' })
    }
  },

  // 获取商品信息
  getProduct: function (id) {
    db.collection('products').doc(id).get().then(res => {
      const product = res.data
      const categoryIndex = this.data.categories.indexOf(product.category)
      this.setData({
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

  // 选择图片
  chooseImage: function () {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        this.setData({ image: res.tempFilePaths[0] })
      }
    })
  },

  // 输入名称
  onNameInput: function (e) {
    this.setData({ name: e.detail.value })
  },

  // 输入价格
  onPriceInput: function (e) {
    this.setData({ price: e.detail.value })
  },

  // 输入库存
  onStockInput: function (e) {
    this.setData({ stock: e.detail.value })
  },

  // 选择分类
  onCategoryChange: function (e) {
    const index = e.detail.value
    this.setData({
      categoryIndex: index,
      category: this.data.categories[index]
    })
  },

  // 输入描述
  onDescInput: function (e) {
    this.setData({ description: e.detail.value })
  },

  // 保存商品
  saveProduct: function () {
    const { name, price, stock, category, description, image, isEdit, id } = this.data
    
    // 验证
    if (!name) {
      wx.showToast({ title: '请输入商品名称', icon: 'none' })
      return
    }
    if (!price || isNaN(price)) {
      wx.showToast({ title: '请输入正确的价格', icon: 'none' })
      return
    }
    if (!stock || isNaN(stock)) {
      wx.showToast({ title: '请输入正确的库存', icon: 'none' })
      return
    }
    if (!category) {
      wx.showToast({ title: '请选择分类', icon: 'none' })
      return
    }

    this.setData({ loading: true })

    // 上传图片
    const uploadTask = image ? this.uploadImage(image) : Promise.resolve('')
    
    uploadTask.then(imageUrl => {
      const productData = {
        name,
        price: parseFloat(price),
        stock: parseInt(stock),
        category,
        description,
        image: imageUrl,
        updateTime: db.serverDate()
      }

      if (isEdit) {
        // 更新商品
        db.collection('products').doc(id).update({
          data: productData
        }).then(() => {
          wx.showToast({ title: '保存成功', icon: 'success' })
          setTimeout(() => wx.navigateBack(), 1500)
        })
      } else {
        // 添加商品
        productData.createTime = db.serverDate()
        productData.status = 'on'
        productData.sales = 0
        
        db.collection('products').add({
          data: productData
        }).then(() => {
          wx.showToast({ title: '添加成功', icon: 'success' })
          setTimeout(() => wx.navigateBack(), 1500)
        })
      }
    }).catch(err => {
      console.error('保存失败', err)
      wx.showToast({ title: '保存失败', icon: 'none' })
      this.setData({ loading: false })
    })
  },

  // 上传图片
  uploadImage: function (filePath) {
    return wx.cloud.uploadFile({
      cloudPath: `products/${Date.now()}-${Math.random().toString(36).substr(2)}.jpg`,
      filePath: filePath
    }).then(res => res.fileID)
  }
})
