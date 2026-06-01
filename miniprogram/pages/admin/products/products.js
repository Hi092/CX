// 商品管理页面
var db = wx.cloud.database()

Page({
  data: {
    products: [],
    allProducts: [],
    loading: true,
    categories: [],
    currentCategory: '',
    searchKey: '',
    themeColor: '#4A90D9'
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
      if (res.data && res.data.categories) self.setData({ categories: res.data.categories })
    }).catch(function () {
      self.setData({ categories: ['饮料', '零食', '方便面', '日用品', '烟酒', '文具', '生鲜'] })
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
