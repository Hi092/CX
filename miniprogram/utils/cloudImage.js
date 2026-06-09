/**
 * 云存储图片工具
 * 将 cloud:// 文件ID 转换为临时可访问URL
 */
function resolveCloudImageURLs(items, callback) {
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
}

function resolveSingleCloudURL(fileID, callback) {
  if (!fileID || typeof fileID !== 'string' || fileID.indexOf('cloud://') !== 0) {
    callback(fileID)
    return
  }
  wx.cloud.getTempFileURL({ fileList: [fileID] }).then(function (res) {
    var url = (res.fileList && res.fileList[0] && res.fileList[0].tempFileURL) || fileID
    callback(url)
  }).catch(function () {
    callback(fileID)
  })
}

module.exports = {
  resolveCloudImageURLs: resolveCloudImageURLs,
  resolveSingleCloudURL: resolveSingleCloudURL
}
