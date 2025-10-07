# Discord Bot Web App - 认证系统

这是一个带有双重登录系统的 Discord Bot 管理 Web 应用。

## 功能特性

### 🔐 双重登录系统

#### 1. 管理员登录
- **用户名**: `fchow`
- **密码**: `Discord.!2022`
- **权限**: 可以授权/撤销用户访问权限

#### 2. 用户登录
- 使用管理员授权的邮箱登录
- 访问权限有时效性

### 📋 管理员功能

1. **授权用户访问**
   - 输入用户邮箱
   - 设置用户密码（至少6个字符）
   - 选择有效期（1天、3天、1周、2周、1个月、3个月）
   - 如果用户已存在，会更新其密码和有效期

2. **查看已授权用户**
   - 显示所有用户列表
   - 查看每个用户的过期时间和剩余天数
   - 撤销用户访问权限（用户会自动被强制退出登录）

3. **统计信息**
   - 总用户数
   - 活跃用户数
   - 已过期用户数

### 👤 用户功能

1. **查看账号信息**
   - 邮箱地址
   - 账号类型
   - 账号状态

2. **查看订阅信息**
   - 到期日期
   - 剩余天数
   - 到期时间

3. **访问 Discord Bot 功能**
   - Token 管理：添加、测试、删除 Discord User Tokens
   - 消息爬取：爬取 Discord 频道的历史消息
   - 命令管理：管理 Bot 命令（待开发）

## 技术栈

- **框架**: Next.js 15.5.4 (App Router)
- **语言**: TypeScript
- **样式**: Tailwind CSS
- **数据库**: SQLite (better-sqlite3)
- **认证**: JWT (jose)
- **密码加密**: bcryptjs

## 项目结构

```
discord-bot/
├── app/
│   ├── actions/
│   │   └── auth.ts              # Server Actions (登录、授权、撤销)
│   ├── admin/
│   │   ├── page.tsx             # 管理员面板
│   │   ├── GrantAccessForm.tsx  # 授权表单组件
│   │   └── UserList.tsx         # 用户列表组件
│   ├── components/
│   │   └── LogoutButton.tsx     # 退出登录按钮
│   ├── dashboard/
│   │   └── page.tsx             # 用户面板
│   ├── login/
│   │   ├── page.tsx             # 登录选择页面
│   │   ├── admin/
│   │   │   └── page.tsx         # 管理员登录页面
│   │   └── user/
│   │       └── page.tsx         # 用户登录页面
│   ├── layout.tsx               # 根布局
│   ├── page.tsx                 # 主页 (重定向)
│   └── globals.css              # 全局样式
├── lib/
│   ├── auth.ts                  # 认证工具函数
│   ├── db.ts                    # 数据库配置和查询
│   └── types.ts                 # TypeScript 类型定义
├── data/
│   └── discord-bot.db           # SQLite 数据库 (自动生成)
├── middleware.ts                # 路由保护中间件
└── package.json
```

## 安装和运行

### 1. 安装依赖
```bash
npm install
```

### 2. 启动开发服务器
```bash
npm run dev
```

### 3. 访问应用
打开浏览器访问: http://localhost:3000

## 使用流程

### 管理员使用流程

1. 访问 http://localhost:3000
2. 选择"管理员登录"
3. 输入凭证:
   - 用户名: `fchow`
   - 密码: `Discord.!2022`
4. 登录后进入管理员面板
5. 在"授权用户访问"表单中:
   - 输入用户邮箱
   - 设置用户密码
   - 选择有效期
   - 点击"授权访问"
6. 在"已授权用户"列表中管理用户

### 用户使用流程

1. 访问 http://localhost:3000
2. 选择"用户登录"
3. 输入管理员授权的邮箱地址和密码
4. 登录后进入用户面板
5. 查看账号信息和使用 Discord Bot 功能

## 数据库

应用使用 SQLite 数据库，自动创建在 `data/discord-bot.db`。

### 数据表

#### admins 表
- `id`: 管理员 ID
- `username`: 用户名
- `password_hash`: 密码哈希

#### users 表
- `id`: 用户 ID
- `email`: 邮箱地址
- `password_hash`: 密码哈希
- `expiry_date`: 过期日期
- `created_at`: 创建时间

## 安全特性

1. **密码加密**: 使用 bcryptjs 加密管理员和用户密码
2. **JWT 认证**: 使用 jose 库生成和验证 JWT token
3. **HTTP-only Cookie**: Session token 存储在 HTTP-only cookie 中
4. **Middleware 保护**: 所有路由都通过 middleware 进行访问控制
5. **角色隔离**: 管理员和用户有不同的访问权限
6. **密码验证**: 用户登录需要验证邮箱和密码
7. **过期检查**: 系统会在用户登录时检查账号是否过期
8. **实时会话监控**: 
   - 客户端每10秒检查一次会话有效性
   - 用户被撤销或过期时自动强制退出登录
   - 用户会被重定向到登录页面

## 撤销用户权限流程

当管理员撤销某个用户的访问权限时：

1. **数据库删除**: 用户记录从数据库中删除
2. **客户端检查**: 用户页面的 SessionMonitor 组件每10秒检查一次
3. **状态验证**: 调用 `/api/check-session` API 验证用户是否仍然有效
4. **强制退出**: 检测到用户无效后，自动跳转到登录页面

**注意**: 由于 Next.js middleware 运行在 Edge Runtime 中，不支持 SQLite 数据库访问，因此用户撤销检测完全依赖客户端的定时检查（最多10秒延迟）。

## 环境变量 (可选)

创建 `.env.local` 文件来自定义配置:

```env
SESSION_SECRET=your-custom-secret-key-here
```

如果不设置，将使用默认密钥。**生产环境中请务必设置自定义密钥！**

## 注意事项

1. **管理员账号**: 默认管理员账号在首次运行时自动创建
2. **数据库位置**: 数据库文件存储在 `data/` 目录，已添加到 `.gitignore`
3. **过期检查**: 系统会在用户登录时检查账号是否过期
4. **时区**: 所有时间使用服务器时区
5. **会话监控**: 用户面板会每10秒检查一次会话有效性（最多10秒延迟）

## Discord Bot 功能

### 📝 Token 管理 (`/dashboard/tokens`)

**功能说明**:
- 添加 Discord User Token（支持自定义名称）
- 测试 Token 有效性（调用 Discord API 验证）
- 查看 Token 关联的用户信息（username, ID, email 等）
- 删除 Token

**数据存储**:
- **数据库**: Token 存储在 `discord_tokens` 数据库表中
- **文件系统**: 同时保存到 `tokens/{用户邮箱}/tokens.json` 文件
- 每个用户可以添加多个 Token
- Token 与用户账号绑定，用户被撤销时自动删除
- 双重备份确保数据安全

**安全性**:
- Token 加密存储在数据库中
- 只有 Token 所有者可以查看和管理自己的 Token
- 测试 Token 时不会泄露完整 Token 内容

### 🌐 消息爬取 (`/dashboard/scrape`)

**功能说明**:
1. 选择要使用的 Discord Token
2. 输入 Discord Channel ID
3. 指定要爬取的消息数量（1-10000）
4. 一键开始爬取

**工作原理**:
- 后端调用 Python 脚本 (`script/scrape_discord_api.py`)
- 使用选定的 Token 调用 Discord REST API
- 爬取指定频道的历史消息
- 保存数据到用户专属目录

**数据目录结构**:
```
tokens/                          # Token 备份目录
└── 用户邮箱_sanitized/
    └── tokens.json              # 用户的所有 tokens

scrape_data/                     # 爬取数据目录
└── 用户邮箱_sanitized/
    ├── channel_123456789/
    │   ├── messages.json
    │   ├── messages.csv
    │   └── attachments/
    │       ├── image1.png
    │       └── image2.jpg
    └── ...
```

**支持的数据类型**:
- 文本消息
- 图片附件
- GIF 动图
- Stickers
- Emoji 反应
- 消息元数据（作者、时间、回复等）

### 📋 使用流程

1. **添加 Token**:
   - 进入"Token 管理"页面
   - 点击"+ 添加Token"
   - 粘贴你的 Discord User Token
   - 可选：添加自定义名称（如"主账号"、"测试账号"）
   - 点击"测试"验证 Token 有效性

2. **爬取消息**:
   - 进入"消息爬取"页面
   - 选择一个有效的 Token
   - 在 Discord 中开启开发者模式
   - 右键点击目标频道 → 复制 ID
   - 粘贴 Channel ID
   - 设置消息数量（建议 100-1000）
   - 点击"开始爬取"
   - 等待爬取完成，查看输出目录

3. **查看数据**:
   - 爬取完成后，数据保存在服务器
   - 输出目录: `scrape_data/你的邮箱/`
   - 可以通过文件管理器访问

## Python 脚本依赖

安装所需的 Python 包:

```bash
# 方法 1: 使用 requirements.txt
pip3 install -r script/requirements.txt

# 方法 2: 手动安装
pip3 install aiohttp aiohttp-socks
```

## Python 脚本配置

所有 Python 脚本使用统一的配置文件: `script/config.py`

### 代理配置

默认启用 SOCKS5 代理，配置如下：

```python
# script/config.py
PROXY_CONFIGS = [
    {
        'proxy_type': 'socks5',
        'addr': '102.177.146.156',
        'port': 50101,
        'username': 'zhouhaha',
        'password': '963091790'
    }
]

# 是否默认使用代理
USE_PROXY_BY_DEFAULT = True
```

**修改代理设置**：
- 编辑 `script/config.py` 文件
- 修改 `PROXY_CONFIGS` 中的代理服务器信息
- 设置 `USE_PROXY_BY_DEFAULT = False` 可禁用默认代理

**所有脚本自动使用配置**：
- `scrape_discord_api.py` - 消息爬取脚本
- `test_tokens.py` - Token 验证脚本
- 未来添加的其他脚本

## 后续开发

您可以在此基础上添加更多功能:

- 数据可视化（消息统计、用户活跃度）
- 批量爬取多个频道
- 定时自动爬取
- 导出为更多格式（Markdown, HTML）
- 消息搜索和过滤
- 邮件通知
- 等等...

## 许可

版权所有 © 2025
