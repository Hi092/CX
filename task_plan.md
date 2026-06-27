# CX项目优化清单

## 已完成
- [x] 管理端鉴权 — manageOrder加admin密码校验
- [x] 提取公共工具函数 — utils/common.js
- [x] 云函数鉴权工具 — cloudfunctions/_shared/auth.js
- [x] 销售统计页面 — stats页面
- [x] 订单搜索 — orders页面搜索栏
- [x] 库存预警 — dashboard低库存提醒
- [x] UI优化 — 去emoji、统一样式

## 待完成（按优先级）
- [ ] 1. 去掉硬编码密码后门 — my.js、settings.js
- [ ] 2. manageProduct云函数加鉴权
- [ ] 3. updateSettings云函数加鉴权
- [ ] 4. printOrder云函数加鉴权
- [ ] 5. 前端管理接口调用传密码
- [ ] 6. 修复onLoad/onShow重复请求
- [ ] 7. 优化dashboard统计查询（where过滤）
- [ ] 8. 优化my.js badge统计（用count）
- [ ] 9. 空catch加日志
- [ ] 10. 删除生产环境console.log
