# Render 部署指南

## 📋 部署前准备

### 1. 提交代码到 GitHub
```bash
git add .
git commit -m "Add Render deployment config"
git push origin main
```

## 🚀 部署步骤

### 方法 1：使用 render.yaml（推荐）

#### 1. 访问 Render Dashboard
1. 前往 https://dashboard.render.com
2. 使用 GitHub 账号登录
3. 点击 **"New +"** → **"Blueprint"**
4. 选择你的 GitHub 仓库 `Discord-web-app`
5. Render 会自动检测 `render.yaml` 并配置服务

#### 2. 自动配置
Render 会根据 `render.yaml` 自动设置：
- ✅ 环境：Node.js + Python
- ✅ 构建命令：安装依赖并构建
- ✅ 启动命令：`npm start`
- ✅ 持久化磁盘：1GB 存储空间

#### 3. 点击 "Apply" 开始部署

---

### 方法 2：手动创建 Web Service

#### 1. 创建新服务
1. 在 Render Dashboard 点击 **"New +"** → **"Web Service"**
2. 连接 GitHub 仓库 `Discord-web-app`

#### 2. 配置服务

**基本设置：**
- **Name**: `discord-web-app`
- **Region**: `Oregon (US West)` 或选择最近的区域
- **Branch**: `main`
- **Root Directory**: 留空（根目录）

**环境：**
- **Environment**: `Node`
- **Build Command**:
  ```bash
  pip install -r requirements.txt && npm install && npm run build
  ```
- **Start Command**:
  ```bash
  npm start
  ```

**实例类型：**
- 选择 **Free**（512MB RAM，免费层级）

#### 3. 环境变量（可选）
点击 "Advanced" 添加：
```
NODE_ENV=production
PYTHON_VERSION=3.11.0
```

#### 4. 添加持久化磁盘
1. 在服务设置中找到 "Disks"
2. 点击 "Add Disk"
3. 配置：
   - **Name**: `discord-data`
   - **Mount Path**: `/opt/render/project/src/data`
   - **Size**: 1GB（免费层级最大）

#### 5. 点击 "Create Web Service"

---

## 📁 文件说明

- **render.yaml** - Render Blueprint 配置（自动部署）
- **requirements.txt** - Python 依赖

## ⚠️ 重要注意事项

### 1. 免费层级限制
Render 免费层级特点：
- ✅ 512MB RAM
- ✅ 共享 CPU
- ✅ 自动 SSL
- ⚠️ **15 分钟无活动后会休眠**
- ⚠️ **冷启动需要 30-60 秒**
- ⚠️ 每月 750 小时运行时间

### 2. 持久化存储
免费层级：
- ✅ 最多 1GB 磁盘空间
- ✅ 文件会永久保存
- ✅ 需要手动配置挂载路径

建议挂载路径：
```
/opt/render/project/src/data        # SQLite 数据库
/opt/render/project/src/scrape_data # 爬取数据
/opt/render/project/src/uploads     # 用户上传
```

### 3. 防止休眠
如果需要保持服务活跃，可以使用外部监控服务定期访问：
- UptimeRobot (免费)
- Cron-job.org (免费)

设置每 10 分钟访问一次你的应用 URL。

### 4. Python 环境
Render 的 Node 环境自动包含 Python 3.11，无需额外配置。

---

## 🔧 故障排查

### 查看日志
在 Render Dashboard：
1. 选择你的服务
2. 点击 "Logs" 标签
3. 查看实时日志

### 常见问题

#### 1. 构建失败
**错误**: `pip: command not found`

**解决方案**: 
在构建命令前添加 Python 路径：
```bash
python3 -m pip install -r requirements.txt && npm install && npm run build
```

#### 2. 应用启动后立即崩溃
- 检查 `npm start` 在本地是否正常运行
- 查看日志中的错误信息
- 确认环境变量是否正确设置

#### 3. 文件上传后丢失
- 确保已添加持久化磁盘
- 检查文件是否保存到挂载路径
- 代码中的文件路径需要使用绝对路径

#### 4. Python 脚本执行失败
- 检查 `requirements.txt` 是否正确
- 确认 Python 版本兼容性
- 查看日志中的 Python 错误信息

---

## 🌐 访问应用

部署成功后，Render 会提供：
- **默认域名**: `https://discord-web-app-xxxx.onrender.com`
- **自定义域名**: 可在设置中添加（付费功能）

### 初次访问
- ⏱️ 如果应用处于休眠状态，首次访问需要等待 30-60 秒
- 🔄 后续访问会很快

---

## 💰 成本估算

### 免费层级
- ✅ $0/月
- ✅ 750 小时运行时间
- ✅ 1GB 磁盘空间
- ⚠️ 会休眠

### 付费层级（如需保持运行）
- **Starter**: $7/月
  - 512MB RAM
  - 不会休眠
  - 10GB 磁盘

- **Standard**: $25/月
  - 2GB RAM
  - 不会休眠
  - 10GB 磁盘
  - 更快的 CPU

---

## 🔄 自动部署

Render 已连接 GitHub 仓库，每次推送到 main 分支会自动：
1. 拉取最新代码
2. 重新构建（安装依赖、运行 build）
3. 部署更新
4. 自动重启服务

```bash
# 本地更新后推送即可自动部署
git add .
git commit -m "Update feature"
git push origin main
```

### 禁用自动部署
如果想手动控制部署：
1. 进入服务设置
2. 找到 "Auto-Deploy"
3. 关闭开关

---

## 🎯 优化建议

### 1. 减少构建时间
在 `package.json` 中添加：
```json
{
  "engines": {
    "node": "20.x",
    "npm": "10.x"
  }
}
```

### 2. 环境特定配置
创建 `.env.production` 文件：
```env
NODE_ENV=production
DATABASE_URL=/opt/render/project/src/data/users.db
```

### 3. 健康检查
Render 会自动检测应用健康状态：
- 如果应用无法启动，会自动回滚到上一个版本
- 可以在设置中配置自定义健康检查路径

---

## 📊 监控和日志

### 查看指标
在 Render Dashboard 可以看到：
- CPU 使用率
- 内存使用率
- 请求数量
- 响应时间

### 日志保留
- 免费层级：保留 7 天
- 付费层级：保留 30 天

---

## 🔐 安全建议

### 1. 使用环境变量
不要在代码中硬编码敏感信息：
- 数据库密码
- API 密钥
- Discord Token

### 2. 配置环境变量
在 Render Dashboard → Environment → Environment Variables 中添加。

### 3. 使用 Secrets
对于特别敏感的数据，使用 Render 的 Secret Files 功能。

---

## 📝 下一步

部署成功后：
1. ✅ 测试所有功能
2. ✅ 配置持久化磁盘
3. ✅ 设置环境变量
4. ✅ 配置防休眠（如需要）
5. ✅ 监控应用性能
6. ✅ 设置告警通知

---

## 🆚 Render vs Railway

| 特性 | Render（免费） | Railway（$5 额度） |
|------|----------------|-------------------|
| 运行时间 | 750h/月 | 500h/月 |
| 内存 | 512MB | 512MB - 8GB |
| 休眠 | ✅ 会休眠 | ❌ 不休眠 |
| 冷启动 | ~60秒 | ~10秒 |
| 磁盘 | 1GB | 按需付费 |
| 数据库 | PostgreSQL 免费 | 需要付费 |
| 构建时间 | 较慢 | 较快 |

**建议**：
- 🆓 **预算有限 + 可接受休眠** → Render 免费层级
- 💰 **需要持续运行** → Railway 或 Render 付费层级

---

## 🎉 完成！

部署完成后，你的 Discord 管理平台就可以在线访问了！

有任何问题随时查看日志或联系支持。
