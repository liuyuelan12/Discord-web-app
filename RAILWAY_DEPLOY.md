# Railway 部署指南

## 📋 部署前准备

### 1. 提交代码到 GitHub
```bash
git add .
git commit -m "Add Railway deployment config"
git push origin main
```

## 🚀 部署步骤

### 1. 访问 Railway
1. 前往 https://railway.app
2. 使用 GitHub 账号登录
3. 点击 "New Project"
4. 选择 "Deploy from GitHub repo"
5. 授权并选择 `Discord-web-app` 仓库

### 2. Railway 会自动：
- ✅ 检测 `package.json`（Node.js）
- ✅ 检测 `requirements.txt`（Python）
- ✅ 使用 `nixpacks.toml` 配置
- ✅ 执行 `npm run build`
- ✅ 启动应用 `npm start`

### 3. 配置环境变量（可选）
在 Railway 项目设置中添加：
```
NODE_ENV=production
```

### 4. 添加持久化存储
1. 在 Railway 项目中点击 "New" → "Volume"
2. 挂载路径设置为：
   - `/app/data` - SQLite 数据库
   - `/app/scrape_data` - 爬取的数据
   - `/app/uploads` - 用户上传的文件
   - `/app/temp` - 临时文件

## 📁 文件说明

- **requirements.txt** - Python 依赖（根目录）
- **nixpacks.toml** - Railway 构建配置
- **.railwayignore** - 部署时忽略的文件

## ⚠️ 注意事项

### 数据持久化
Railway 默认的文件系统是临时的，需要配置 Volume 来持久化：
- SQLite 数据库文件
- 用户上传的 CSV 和媒体文件
- 爬取的数据

### Python 脚本执行
由于 Railway 使用 Serverless 架构：
- API 路由中的 Python 脚本会正常执行
- 长时间运行的任务需要确保在超时前完成
- 如果需要后台常驻任务，考虑使用 Railway Workers

## 🔧 故障排查

### 查看日志
在 Railway 项目页面点击 "Deployments" → 选择最新部署 → "View Logs"

### 常见问题

**1. Python 依赖安装失败**
- 检查 `requirements.txt` 是否在根目录
- 查看日志中的错误信息

**2. 构建失败**
- 检查 `nixpacks.toml` 配置
- 确认 `npm run build` 本地可以成功

**3. 数据丢失**
- 确保已配置 Volume
- 检查挂载路径是否正确

## 📊 成本估算

Railway 免费额度：
- ✅ $5 试用额度
- ✅ 500 小时执行时间/月
- ✅ 100GB 出站流量

超出后按使用量计费：
- vCPU: $0.000463/分钟
- 内存: $0.000231/GB/分钟
- 存储: $0.25/GB/月

预计成本：$5-20/月（取决于流量和使用时长）

## 🌐 访问应用

部署成功后，Railway 会提供：
- **默认域名**: `your-app.up.railway.app`
- **自定义域名**: 可在设置中添加

## 🔄 自动部署

Railway 已连接 GitHub 仓库，每次推送到 main 分支会自动：
1. 拉取最新代码
2. 重新构建
3. 部署更新

```bash
# 本地更新后推送即可自动部署
git add .
git commit -m "Update feature"
git push origin main
```

## 📝 下一步

部署成功后：
1. ✅ 测试所有功能
2. ✅ 配置环境变量
3. ✅ 设置持久化存储
4. ✅ 添加自定义域名（可选）
5. ✅ 监控应用性能和日志
