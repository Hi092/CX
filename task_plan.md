# CX项目全面优化计划

## 高危修复
1. [ ] 管理端鉴权 — manageOrder/manageProduct/updateSettings/printOrder 加admin密码校验
2. [ ] 删除硬编码密码后门 — my.js、settings.js 里的 `pwd === '123456'`
3. [ ] 库存原子扣减 — manageOrder.pay 合并检查和扣减

## 中危优化
4. [ ] 提取公共工具函数 — getTimeMs/isPendingExpired → utils/common.js
5. [ ] 修复onLoad/onShow重复请求 — category、cart、dashboard、settings
6. [ ] 优化统计查询 — dashboard用where过滤日期，my.js用count()统计badge
7. [ ] 配置存储统一 — 逐步迁移到settings集合，products里只放商品

## 低危清理
8. [ ] 空catch加日志
9. [ ] 删除生产环境console.log
10. [ ] 代码清理
