# CX - 小区便利店送货小程序

## 功能介绍

### 顾客端
- 微信一键登录
- 商品分类浏览
- 商品搜索
- 购物车（加减数量、删除）
- 收货地址管理（小区+楼号+门牌号）
- 下单（模拟支付）
- 订单状态查看

### 商家端（同一小程序切换身份）
- 今日订单/收入统计
- 订单管理（待配送/配送中/已完成）
- 标记已配送
- 商品管理（增删改查）
- 库存管理
- 上下架商品
- 店铺设置（营业时间/起送价/配送费/配送范围）

## 技术栈
- 微信小程序原生开发
- 微信云开发（免服务器）
- 云数据库存储数据

## 使用方法

### 1. 注册微信小程序
1. 访问 https://mp.weixin.qq.com/
2. 注册小程序账号
3. 获取 AppID

### 2. 开通云开发
1. 下载微信开发者工具
2. 导入本项目
3. 在开发者工具中开通云开发
4. 创建云开发环境

### 3. 配置项目
1. 修改 `project.config.json` 中的 `appid` 为你的 AppID
2. 修改 `app.js` 中的 `env` 为你的云开发环境ID
3. 修改 `app.js` 中的 `adminOpenid` 为你的 openid（用于商家权限）

### 4. 创建云数据库集合
在云开发控制台创建以下集合：
- `products` - 商品表
- `orders` - 订单表
- `settings` - 设置表

### 5. 部署云函数
右键点击 `cloudfunctions/login` 目录，选择"上传并部署"

### 6. 预览和发布
1. 点击"预览"按钮在手机上测试
2. 测试无误后点击"上传"提交审核

## 数据库结构

### products 商品表
```json
{
  "_id": "自动生成",
  "name": "商品名称",
  "price": 3.5,
  "stock": 100,
  "category": "饮料",
  "description": "商品描述",
  "image": "图片链接",
  "status": "on",
  "sales": 0,
  "createTime": "创建时间",
  "updateTime": "更新时间"
}
```

### orders 订单表
```json
{
  "_id": "自动生成",
  "orderNo": "订单号",
  "items": [
    {
      "productId": "商品ID",
      "name": "商品名称",
      "price": 3.5,
      "quantity": 2,
      "image": "图片"
    }
  ],
  "totalPrice": 7.0,
  "deliveryFee": 0,
  "finalPrice": 7.0,
  "address": {
    "name": "收货人",
    "phone": "手机号",
    "community": "小区名",
    "building": "楼号",
    "unit": "单元",
    "room": "门牌号"
  },
  "remark": "备注",
  "status": "pending",
  "createTime": "创建时间",
  "payTime": "支付时间",
  "deliveryTime": "配送时间",
  "completeTime": "完成时间"
}
```

### settings 设置表
```json
{
  "_id": "shop",
  "shopName": "邻居优选",
  "shopPhone": "手机号",
  "openTime": "08:00",
  "closeTime": "23:00",
  "minPrice": 20,
  "deliveryFee": 2,
  "freeDeliveryPrice": 20,
  "deliveryRange": "幸福小区"
}
```

## 注意事项

1. **微信支付**：demo版本使用模拟支付，真实支付需要申请微信商户号
2. **管理员权限**：首次登录后，在控制台获取你的 openid，填入 `app.js` 中
3. **图片上传**：商品图片会上传到云存储，注意控制图片大小
4. **免费额度**：云开发有一定的免费额度，小规模使用完全够用

## 后续优化
- [ ] 接入真实微信支付
- [ ] 添加订单推送通知
- [ ] 添加商品图片压缩
- [ ] 添加订单导出功能
- [ ] 添加数据统计图表
