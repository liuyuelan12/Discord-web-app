# Discord Message Scraper (TypeScript版本)

使用Discord REST API爬取频道消息的TypeScript工具。

## 环境要求

- Node.js >= 16.0.0
- npm 或 yarn

## 安装步骤

### 1. 安装Node.js

如果还没有安装Node.js，请先安装：

```bash
# macOS (使用Homebrew)
brew install node

# 或下载安装包
# https://nodejs.org/
```

### 2. 安装依赖

```bash
# 在项目目录下运行
npm install

# 或使用yarn
yarn install
```

## 使用方法

### 列出所有可用频道

```bash
npm run list
# 或
npx ts-node src/scrape.ts --list
```

### 爬取消息

```bash
# 使用索引
npx ts-node src/scrape.ts -c 0 -l 500

# 使用服务器+频道名
npx ts-node src/scrape.ts -c "fightid general" -l 500

# 使用Channel ID
npx ts-node src/scrape.ts -c 1329891599861415949 -l 500

# 不使用代理
npx ts-node src/scrape.ts -c 0 -l 500 --no-proxy
```

### 编译并运行

```bash
# 编译TypeScript
npm run build

# 运行编译后的代码
node dist/scrape.js -c 0 -l 500
```

## 命令行参数

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `-c, --channel <channel>` | 频道标识（索引/名称/ID） | 必需 |
| `--list` | 列出所有可用频道 | - |
| `-l, --limit <number>` | 爬取消息数量 | 100 |
| `-t, --token-index <number>` | 使用的token索引 | 0 |
| `--token-file <path>` | Token文件路径 | Discord_Token.json |
| `--config-file <path>` | 配置文件路径 | Server_and_Channel.json |
| `-o, --output-dir <path>` | 输出目录 | 发言脚本 |
| `--no-proxy` | 不使用代理（默认使用） | - |

## Python vs TypeScript

### Python版本
- 使用venv虚拟环境
- 运行: `python scrape_discord_api.py`

### TypeScript版本  
- 使用npm管理依赖
- 运行: `npx ts-node src/scrape.ts` 或 `npm run dev`

**注意**: Python的venv和Node.js的npm是完全独立的！不能混用！

## 项目结构

```
.
├── src/
│   └── scrape.ts          # TypeScript源代码
├── dist/                  # 编译后的JavaScript（运行npm run build后生成）
├── package.json           # Node.js依赖配置
├── tsconfig.json          # TypeScript配置
├── Discord_Token.json     # Discord token配置
└── Server_and_Channel.json # 服务器频道配置
```

## 输出格式

与Python版本相同：
- CSV文件：包含消息内容和元数据
- media文件夹：下载的图片、视频等附件

## 故障排除

### 找不到模块

```bash
# 确保安装了所有依赖
npm install
```

### TypeScript编译错误

```bash
# 检查TypeScript版本
npx tsc --version

# 重新安装依赖
rm -rf node_modules package-lock.json
npm install
```

### 代理连接失败

检查SOCKS5代理配置是否正确（在`src/scrape.ts`中）。
