// 商品管理页面
var db = wx.cloud.database()

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
    var s = wx.getStorageSync('shopSettings')
    if (s && s.themeColor) this.setData({ themeColor: s.themeColor })
    this.loadCategories()
    this.getProducts()
  },

  onShow: function () {
    var s = wx.getStorageSync('shopSettings')
    if (s && s.themeColor) this.setData({ themeColor: s.themeColor })
    this.loadCategories()
    this.getProducts()
  },

  loadCategories: function () {
    var self = this
    db.collection('settings').doc('shop').get().then(function (res) {
      if (res.data && res.data.categories) self.setData({ categories: res.data.categories, allCategories: res.data.categories })
    }).catch(function () {
      self.setData({ categories: ['饮料', '零食', '方便面', '日用品', '烟酒', '文具', '生鲜'], allCategories: ['饮料', '零食', '方便面', '日用品', '烟酒', '文具', '生鲜'] })
    })
  },

  onPullDownRefresh: function () {
    var self = this
    this.getProducts().then(function () { wx.stopPullDownRefresh() })
  },

  getProducts: function () {
    var self = this
    self.setData({ loading: true })
    return db.collection('products').limit(100).get().then(function (res) {
      self.setData({ allProducts: res.data })
      self.filterProducts()
    }).catch(function () {
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
        if (p.name.toLowerCase().indexOf(searchKey.toLowerCase()) === -1) match = false
      }
      if (match) filtered.push(p)
    }
    this.setData({ products: filtered, loading: false })
  },

  onSearch: function (e) { this.setData({ searchKey: e.detail.value }); this.filterProducts() },
  clearSearch: function () { this.setData({ searchKey: '' }); this.filterProducts() },
  filterCategory: function (e) { this.setData({ currentCategory: e.currentTarget.dataset.id }); this.filterProducts() },
  addProduct: function () { wx.navigateTo({ url: '/pages/admin/products/edit' }) },
  editProduct: function (e) { wx.navigateTo({ url: '/pages/admin/products/edit?id=' + e.currentTarget.dataset.id }) },
  viewProduct: function (e) { wx.navigateTo({ url: '/pages/admin/products/edit?id=' + e.currentTarget.dataset.id }) },

  // ========= 分类管理 =========
  toggleCatPanel: function () {
    this.setData({ showCatPanel: !this.data.showCatPanel })
  },

  addCategory: function () {
    var self = this
    wx.showModal({
      title: '添加分类', editable: true, placeholderText: '输入分类名称',
      success: function (res) {
        if (res.confirm && res.content) {
          var name = res.content.trim()
          if (!name) return
          var cats = self.data.allCategories
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
          var cats = self.data.allCategories
          cats.splice(index, 1)
          self.setData({ allCategories: cats })
        }
      }
    })
  },

  saveCategories: function () {
    this.setData({ savingCats: true })
    var self = this
    var cats = this.data.allCategories
    wx.cloud.callFunction({
      name: 'updateSettings',
      data: { data: { categories: cats } },
      success: function () {
        self.setData({ savingCats: false, showCatPanel: false, categories: cats })
        wx.setStorageSync('shopCategories', cats)
        wx.showToast({ title: '分类已保存', icon: 'success' })
      },
      fail: function () {
        self.setData({ savingCats: false })
        wx.showToast({ title: '保存失败', icon: 'none' })
      }
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
          db.collection('products').doc(id).remove().then(function () {
            wx.showToast({ title: '已删除', icon: 'success' })
            self.getProducts()
          })
        }
      }
    })
  }
})
