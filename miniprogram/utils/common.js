/**
 * 公共工具函数
 * 时间解析、过期判断等通用逻辑
 */
var PENDING_EXPIRE_MS = 10 * 60 * 1000

function getTimeMs(timestamp) {
  if (!timestamp) return 0
  if (typeof timestamp === 'number') return timestamp
  if (typeof timestamp === 'object' && timestamp.getTime) return timestamp.getTime()
  if (typeof timestamp === 'object' && timestamp.$date) return new Date(timestamp.$date).getTime()
  var t = new Date(timestamp).getTime()
  return isNaN(t) ? 0 : t
}

function isPendingExpired(order) {
  if (!order || order.status !== 'pending') return false
  var createMs = getTimeMs(order.createTime)
  if (!createMs) return false
  return Date.now() - createMs >= PENDING_EXPIRE_MS
}

function formatTime(timestamp) {
  if (!timestamp) return ''
  var d = typeof timestamp === 'object' && timestamp.$date ? new Date(timestamp.$date) : new Date(timestamp)
  var pad = function (n) { return n < 10 ? '0' + n : '' + n }
  return pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes())
}

function formatFullTime(timestamp) {
  if (!timestamp) return ''
  var d = typeof timestamp === 'object' && timestamp.$date ? new Date(timestamp.$date) : new Date(timestamp)
  var pad = function (n) { return n < 10 ? '0' + n : '' + n }
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes())
}

function getStatusText(status) {
  var map = { 'pending': '待付款', 'paid': '待配送', 'delivering': '配送中', 'completed': '已完成' }
  return map[status] || status
}

module.exports = {
  PENDING_EXPIRE_MS: PENDING_EXPIRE_MS,
  getTimeMs: getTimeMs,
  isPendingExpired: isPendingExpired,
  formatTime: formatTime,
  formatFullTime: formatFullTime,
  getStatusText: getStatusText
}
