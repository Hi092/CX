// 商品管理页面 - 直读商品和配置
var db = wx.cloud.database()
var CONFIG_DOC_ID = 'shop_config_v1'
var DEFAULT_CATEGORIES = ['饮料', '零食', '方便面', '日用品', '烟酒', '文具', '生鲜']

Page({
  data: {
    products: [],
    allProducts: [],
    loading: true,
    categories: [],
    allCategories: [],
    currentCategory: '',
    searchKey: '',
    themeColor: '#4A90D9',
    showCatPanel: false,
    savingCats: false
  },

  onLoad: function () {
    this.loadTheme()
    this.loadCategories()
    this.getProducts()
  },

  onShow: function () {
    this.loadTheme()
    this.getProducts()
  },

  loadTheme: function () {
    var s = wx.getStorageSync('shopSettings')
    if (s && s.themeColor) this.setData({ themeColor: s.themeColor })
  },

  isArray: function (v) {
    return Object.prototype.toString.call(v) === '[object Array]'
  },

  applyCategories: function (cats) {
    if (!this.isArray(cats)) cats = DEFAULT_CATEGORIES
    this.setData({ categories: cats, allCategories: cats })
    wx.setStorageSync('shopCategories', cats)
    var s = wx.getStorageSync('shopSettings') || {}
    s.categories = cats
    wx.setStorageSync('shopSettings', s)
  },

  loadCategories: function () {
    var self = this
    var cachedCats = wx.getStorageSync('shopCategories')
    var shopSettings = wx.getStorageSync('shopSettings') || {}
    if (self.isArray(cachedCats)) self.applyCategories(cachedCats)
    else if (self.isArray(shopSettings.categories)) self.applyCategories(shopSettings.categories)
    else self.applyCategories(DEFAULT_CATEGORIES)

    db.collection('products').doc(CONFIG_DOC_ID).get().then(function (res) {
      if (res.data && self.isArray(res.data.categories)) self.applyCategories(res.data.categories)
    }).catch(function (err) {
      console.error('读取分类配置失败', err)
    })
  },

  cleanProducts: function (list) {
    var arr = []
    for (var i = 0; i < list.length; i++) {
      var p = list[i]
      if (!p) continue
      if (p._id === CONFIG_DOC_ID || p._type === 'shopConfig') continue
      arr.push(p)
    }
    return arr
  },

  getProducts: function () {
    var self = this
    self.setData({ loading: true })
    db.collection('products').limit(100).get().then(function (res) {
      var products = self.cleanProducts(res.data || [])
      self.resolveCloudImageURLs(products, function (resolved) {
        self.setData({ allProducts: resolved })
        self.filterProducts()
      })
    }).catch(function (err) {
      console.error('读取商品失败', err)
      self.setData({ allProducts: [], loading: false })
      self.filterProducts()
    })
  },

  filterProducts: function () {
    var allProducts = this.data.allProducts
    var currentCategory = this.data.currentCategory
    var searchKey = this.data.searchKey
    var filtered = []
    for (var i = 0; i < allProducts.length; i++) {
      var p = allProducts[i]
      var match = true
      if (currentCategory && p.category !== currentCategory) match = false
      if (match && searchKey) {
        if (!p.name || p.name.toLowerCase().indexOf(searchKey.toLowerCase()) === -1) match = false
      }
      if (match) filtered.push(p)
    }
    this.setData({ products: filtered, loading: false })
  },

  resolveCloudImageURLs: function (items, callback) {
    if (!items || items.length === 0) { callback(items); return }
    var fileIDs = []
    var indices = []
    for (var i = 0; i < items.length; i++) {
      var img = items[i] && items[i].image
      if (img && typeof img === 'string' && img.indexOf('cloud://') === 0) {
        fileIDs.push(img)
        indices.push(i)
      }
    }
    if (fileIDs.length === 0) { callback(items); return }
    wx.cloud.getTempFileURL({ fileList: fileIDs }).then(function (res) {
      var map = {}
      var list = res.fileList || []
      for (var j = 0; j < list.length; j++) {
        if (list[j].tempFileURL) map[list[j].fileID] = list[j].tempFileURL
      }
      for (var k = 0; k < indices.length; k++) {
        var url = map[fileIDs[k]]
        if (url) {
          items[indices[k]]._imageFileID = fileIDs[k]
          items[indices[k]].image = url
        }
      }
      callback(items)
    }).catch(function () {
      callback(items)
    })
  },

  onSearch: function (e) { this.setData({ searchKey: e.detail.value }); this.filterProducts() },
  doSearch: function () { this.filterProducts() },
  clearSearch: function () { this.setData({ searchKey: '' }); this.filterProducts() },
  filterCategory: function (e) { this.setData({ currentCategory: e.currentTarget.dataset.id }); this.filterProducts() },
  addProduct: function () { wx.navigateTo({ url: '/pages/admin/products/edit' }) },
  editProduct: function (e) { wx.navigateTo({ url: '/pages/admin/products/edit?id=' + e.currentTarget.dataset.id }) },
  viewProduct: function (e) { wx.navigateTo({ url: '/pages/admin/products/edit?id=' + e.currentTarget.dataset.id }) },

  toggleCatPanel: function () { this.setData({ showCatPanel: !this.data.showCatPanel }) },

  addCategory: function () {
    var self = this
    wx.showModal({
      title: '添加分类', editable: true, placeholderText: '输入分类名称',
      success: function (res) {
        if (res.confirm && res.content) {
          var name = res.content.trim()
          if (!name) return
          var cats = self.data.allCategories.slice()
          for (var i = 0; i < cats.length; i++) {
            if (cats[i] === name) { wx.showToast({ title: '分类已存在', icon: 'none' }); return }
          }
          cats.push(name)
          self.setData({ allCategories: cats })
        }
      }
    })
  },

  deleteCategory: function (e) {
    var index = e.currentTarget.dataset.index
    var self = this
    wx.showModal({
      title: '提示', content: '确定删除「' + self.data.allCategories[index] + '」分类？',
      success: function (res) {
        if (res.confirm) {
          var cats = self.data.allCategories.slice()
          cats.splice(index, 1)
          self.setData({ allCategories: cats })
        }
      }
    })
  },

  saveCategories: function () {
    var self = this
    var cats = this.data.allCategories.slice()
    if (self.data.savingCats) return
    self.setData({ savingCats: true })
    wx.showLoading({ title: '保存中...' })

    var cached = wx.getStorageSync('shopSettings') || {}
    cached.categories = cats
    wx.setStorageSync('shopCategories', cats)
    wx.setStorageSync('shopSettings', cached)

    var docData = {}
    for (var k in cached) docData[k] = cached[k]
    docData._type = 'shopConfig'
    docData.key = 'shopSettings'
    docData.categories = cats
    docData.updateTime = db.serverDate()

    db.collection('products').doc(CONFIG_DOC_ID).update({ data: docData }).then(function () {
      wx.cloud.callFunction({ name: 'updateSettings', data: { data: cached } })
      wx.hideLoading()
      self.setData({ savingCats: false, showCatPanel: false, categories: cats, allCategories: cats })
      wx.showToast({ title: '分类已保存', icon: 'success' })
    }).catch(function () {
      db.collection('products').doc(CONFIG_DOC_ID).set({ data: docData }).then(function () {
        wx.cloud.callFunction({ name: 'updateSettings', data: { data: cached } })
        wx.hideLoading()
        self.setData({ savingCats: false, showCatPanel: false, categories: cats, allCategories: cats })
        wx.showToast({ title: '分类已保存', icon: 'success' })
      }).catch(function (err) {
        wx.hideLoading()
        console.error('保存分类失败', err)
        self.setData({ savingCats: false })
        wx.showToast({ title: '保存失败', icon: 'none' })
      })
    })
  },

  toggleStatus: function (e) {
    var id = e.currentTarget.dataset.id
    var status = e.currentTarget.dataset.status
    var newStatus = status === 'on' ? 'off' : 'on'
    var actionText = newStatus === 'on' ? '上架' : '下架'
    var self = this
    wx.showModal({
      title: actionText, content: '确定要' + actionText + '吗？',
      success: function (res) {
        if (res.confirm) {
          db.collection('products').doc(id).update({ data: { status: newStatus } }).then(function () {
            wx.showToast({ title: '已' + actionText, icon: 'success' })
            self.getProducts()
          }).catch(function () {
            wx.cloud.callFunction({
              name: 'manageProduct',
              data: { action: 'toggleStatus', id: id, data: { status: newStatus } },
              success: function (res) {
                if (res.result && res.result.success) {
                  wx.showToast({ title: '已' + actionText, icon: 'success' })
                  self.getProducts()
                } else {
                  wx.showToast({ title: '操作失败', icon: 'none' })
                }
              },
              fail: function () { wx.showToast({ title: '操作失败', icon: 'none' }) }
            })
          })
        }
      }
    })
  },

  deleteProduct: function (e) {
    var id = e.currentTarget.dataset.id
    var self = this
    wx.showModal({
      title: '删除', content: '确定删除？无法恢复！', confirmColor: '#FF0000',
      success: function (res) {
        if (res.confirm) {
          wx.showLoading({ title: '删除中...' })
          db.collection('products').doc(id).remove().then(function () {
            wx.hideLoading()
            wx.showToast({ title: '已删除', icon: 'success' })
            self.getProducts()
          }).catch(function () {
            wx.cloud.callFunction({
              name: 'manageProduct',
              data: { action: 'delete', id: id },
              success: function (res) {
                wx.hideLoading()
                if (res.result && res.result.success) {
                  wx.showToast({ title: '已删除', icon: 'success' })
                  self.getProducts()
                } else {
                  wx.showToast({ title: '删除失败', icon: 'none' })
                }
              },
              fail: function () {
                wx.hideLoading()
                wx.showToast({ title: '删除失败', icon: 'none' })
              }
            })
          })
        }
      }
    })
  }
})
