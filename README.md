# 🍜 今日投喂

女朋友点菜，男朋友接单的专属投喂系统。

## 📂 项目结构

```
index.html      ← 主应用（点菜端 + 管理端）
server.js       ← WebSocket 实时通知服务器
package.json    ← 依赖
```

## 🚀 快速启动

### 1. 直接打开（单机模式）
双击 `index.html` 用浏览器打开即可，数据存本地。

### 2. 开启实时通知（双人模式）
```bash
npm install
node server.js
```
然后两个设备都打开 `index.html` → 实时同步订单和通知。

## 📱 手机上使用

部署到 GitHub Pages 后，手机浏览器打开链接即可点菜。

---

密码管理 → 点右上角 🔒 图标设置。
