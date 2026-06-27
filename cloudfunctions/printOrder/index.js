// 云函数入口 - printOrder
// 发送ESC/POS指令到WiFi小票打印机
const cloud = require('wx-server-sdk')
const net = require('net')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const CONFIG_DOC_ID = 'shop_config_v1'
const DEFAULT_PASSWORD = '123456'

async function verifyAdmin(inputPwd) {
  if (!inputPwd) return false
  try {
    var data = null
    try {
      var cfg = await db.collection('products').doc(CONFIG_DOC_ID).get()
      if (cfg.data) data = cfg.data
    } catch (e1) {}
    if (!data) {
      try {
        var res = await db.collection('settings').doc('shop').get()
        if (res.data) data = res.data
      } catch (e2) {}
    }
    var shopPassword = data && (data.shopPassword || data.password)
    if (!shopPassword) shopPassword = DEFAULT_PASSWORD
    return inputPwd === shopPassword
  } catch (err) {
    return false
  }
}

// ESC/POS 指令集
var ESC = {
  INIT: Buffer.from([0x1B, 0x40]),
  BOLD_ON: Buffer.from([0x1B, 0x45, 0x01]),
  BOLD_OFF: Buffer.from([0x1B, 0x45, 0x00]),
  CENTER: Buffer.from([0x1B, 0x61, 0x01]),
  LEFT: Buffer.from([0x1B, 0x61, 0x00]),
  FEED: Buffer.from([0x1B, 0x64, 0x03]),
  CUT: Buffer.from([0x1D, 0x56, 0x00]),
  SIZE_NORMAL: Buffer.from([0x1D, 0x21, 0x00]),
  SIZE_DOUBLE_W: Buffer.from([0x1D, 0x21, 0x20]),
  SIZE_DOUBLE: Buffer.from([0x1D, 0x21, 0x11]),
}

function buildTestPrint(paper) {
  var bufs = []
  bufs.push(ESC.INIT)
  bufs.push(ESC.CENTER)
  bufs.push(ESC.BOLD_ON)
  bufs.push(ESC.SIZE_DOUBLE_W)
  bufs.push(Buffer.from('邻里优选\n', 'utf8'))
  bufs.push(ESC.SIZE_NORMAL)
  bufs.push(ESC.BOLD_OFF)
  bufs.push(Buffer.from('--- 打印机测试 ---\n\n', 'utf8'))
  bufs.push(ESC.LEFT)
  bufs.push(Buffer.from('打印机连接成功！\n', 'utf8'))
  bufs.push(Buffer.from('纸张规格: ' + (paper || '80mm') + '\n', 'utf8'))
  bufs.push(Buffer.from('打印时间: ' + new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }) + '\n', 'utf8'))
  bufs.push(Buffer.from('\n', 'utf8'))
  bufs.push(ESC.FEED)
  bufs.push(ESC.CUT)
  return Buffer.concat(bufs)
}

function buildOrderPrint(order, paper) {
  var bufs = []
  bufs.push(ESC.INIT)
  bufs.push(ESC.CENTER)
  bufs.push(ESC.BOLD_ON)
  bufs.push(ESC.SIZE_DOUBLE_W)
  bufs.push(Buffer.from((order.shopName || '邻里优选') + '\n', 'utf8'))
  bufs.push(ESC.SIZE_NORMAL)
  bufs.push(ESC.BOLD_OFF)
  bufs.push(Buffer.from('外卖订单\n', 'utf8'))
  bufs.push(Buffer.from('================================\n', 'utf8'))

  bufs.push(ESC.LEFT)
  bufs.push(Buffer.from('订单号: ' + (order.orderNo || order._id || '') + '\n', 'utf8'))
  bufs.push(Buffer.from('下单时间: ' + (order.createTime || '') + '\n', 'utf8'))
  bufs.push(Buffer.from('--------------------------------\n', 'utf8'))

  var items = order.items || []
  for (var i = 0; i < items.length; i++) {
    var item = items[i]
    var name = item.name || ''
    var qty = item.quantity || 1
    var price = item.price || 0
    var line = name
    if (line.length < 16) {
      for (var j = line.length; j < 16; j++) line += ' '
    }
    line += 'x' + qty + '  ¥' + (price * qty).toFixed(2) + '\n'
    bufs.push(Buffer.from(line, 'utf8'))
  }

  bufs.push(Buffer.from('--------------------------------\n', 'utf8'))
  bufs.push(ESC.BOLD_ON)
  bufs.push(Buffer.from('合计: ¥' + (order.totalPrice || '0.00') + '\n', 'utf8'))
  bufs.push(ESC.BOLD_OFF)

  if (order.deliveryFee && order.deliveryFee > 0) {
    bufs.push(Buffer.from('配送费: ¥' + order.deliveryFee.toFixed(2) + '\n', 'utf8'))
  }
  bufs.push(Buffer.from('\n', 'utf8'))
  bufs.push(Buffer.from('收货人: ' + (order.userName || '') + '\n', 'utf8'))
  bufs.push(Buffer.from('电话: ' + (order.userPhone || '') + '\n', 'utf8'))
  bufs.push(Buffer.from('地址: ' + (order.address || '') + '\n', 'utf8'))
  if (order.remark) {
    bufs.push(Buffer.from('备注: ' + order.remark + '\n', 'utf8'))
  }
  bufs.push(Buffer.from('\n', 'utf8'))
  bufs.push(ESC.CENTER)
  bufs.push(Buffer.from('谢谢惠顾\n', 'utf8'))
  bufs.push(ESC.FEED)
  bufs.push(ESC.CUT)
  return Buffer.concat(bufs)
}

function sendToPrinter(ip, port, data) {
  return new Promise(function (resolve, reject) {
    var client = new net.Socket()
    var timeout = setTimeout(function () {
      client.destroy()
      reject(new Error('连接超时'))
    }, 5000)

    client.connect(port, ip, function () {
      clearTimeout(timeout)
      client.write(data, function () {
        client.destroy()
        resolve({ success: true })
      })
    })

    client.on('error', function (err) {
      clearTimeout(timeout)
      client.destroy()
      reject(err)
    })
  })
}

exports.main = async (event, context) => {
  var action = event.action || 'test'
  var printerIp = event.printerIp
  var printerPort = event.printerPort || 9100
  var printerPaper = event.printerPaper || '80mm'

  if (!printerIp) {
    return { success: false, error: '未指定打印机IP' }
  }

  try {
    // 管理端鉴权
    var isAdmin = await verifyAdmin(event._adminPwd)
    if (!isAdmin) return { success: false, error: 'NO_PERMISSION', message: '管理密码错误' }

    var data
    if (action === 'test') {
      data = buildTestPrint(printerPaper)
    } else if (action === 'printOrder') {
      data = buildOrderPrint(event.order || {}, printerPaper)
    } else {
      return { success: false, error: '未知操作: ' + action }
    }

    var result = await sendToPrinter(printerIp, printerPort, data)
    return result
  } catch (err) {
    console.error('打印失败:', err)
    return { success: false, error: err.message || '打印失败' }
  }
}
