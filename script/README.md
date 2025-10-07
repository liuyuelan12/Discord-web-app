# Discord消息爬取工具

这个工具可以爬取Discord频道的历史消息，包括文本、图片、GIF、sticker、emoji等。

## 安装依赖

确保已激活虚拟环境，然后安装依赖：

```bash
pip install -r requirements.txt
```

## 使用方法

### 基本用法

爬取指定频道的最近100条消息：

```bash
python scrape_discord_messages.py -c 1329891599861415949 -l 100
```

### 参数说明

- `-c, --channel-id`: **(必需)** 要爬取的频道ID
- `-l, --limit`: 爬取的消息数量 (默认: 100)
- `-t, --token-index`: 使用的token索引 (默认: 0，使用第一个token)
- `--token-file`: Token文件路径 (默认: Discord_Token.json)
- `--config-file`: 服务器配置文件路径 (默认: Server_and_Channel.json)
- `-o, --output-dir`: 输出目录 (默认: /Users/Zhuanz/Desktop/Discord Bot/发言脚本)
- `--use-proxy`: 使用SOCKS5代理（代理配置在脚本中）

### 示例

#### 1. 爬取FightID服务器的general频道最近100条消息

```bash
python scrape_discord_messages.py -c 1329891599861415949 -l 100
```

#### 2. 爬取Test Server的chinese频道最近500条消息

```bash
python scrape_discord_messages.py -c 1424344213566263337 -l 500
```

#### 3. 使用第2个token爬取消息

```bash
python scrape_discord_messages.py -c 1329891599861415949 -l 100 -t 1
```

#### 4. 使用SOCKS5代理爬取消息（推荐，解决连接超时问题）

```bash
python scrape_discord_messages.py -c 1329891599861415949 -l 500 --use-proxy
```

## 输出格式

### 目录结构

```
发言脚本/
└── FightID/                    # 服务器名称
    ├── general_messages.csv    # 消息CSV文件
    └── media/                  # 媒体文件夹
        ├── 123456_789012.png
        ├── 123456_789013.gif
        └── ...
```

### CSV字段说明

- **消息ID**: Discord消息的唯一ID
- **时间戳**: 消息发送时间
- **作者**: 发送者用户名#标签
- **作者ID**: 发送者的Discord ID
- **内容**: 消息文本内容
- **附件数量**: 附件文件数量
- **附件路径**: 附件文件相对路径，用 `|` 分隔多个文件
- **Stickers**: 消息中的sticker，用 `|` 分隔
- **Emoji反应**: 消息的emoji反应，格式为 `emoji:数量`，用 `|` 分隔
- **提及用户**: @提及的用户，用 `|` 分隔
- **是否置顶**: 消息是否被置顶
- **回复消息ID**: 如果是回复，显示被回复消息的ID

## 注意事项

1. **Bot权限**: 确保您的Discord bot有权限访问目标频道
2. **Token有效性**: 使用有效的Discord bot token
3. **API限制**: Discord API有速率限制，大量爬取时请注意
4. **媒体索引**: CSV中的`附件路径`字段记录了相对于服务器文件夹的媒体路径，方便后续发言脚本使用

## 配置文件

### Discord_Token.json

存储Discord bot tokens的JSON数组：

```json
[
  "token1",
  "token2",
  "token3"
]
```

### Server_and_Channel.json

存储服务器和频道配置：

```json
{
  "servers": [
    {
      "server_id": "1329891599177486399",
      "server_name": "FightID",
      "channels": {
        "general": {
          "name": "General Channel",
          "channel_id": "1329891599861415949",
          "url": "..."
        }
      }
    }
  ]
}
```

## SOCKS5代理配置

如果遇到连接超时问题，可以使用SOCKS5代理。代理配置位于脚本顶部的 `PROXY_CONFIGS` 列表中：

```python
PROXY_CONFIGS = [
    {
        'proxy_type': 'socks5',
        'addr': '102.177.146.156',
        'port': 50101,
        'username': 'zhouhaha',
        'password': '963091790'
    }
]
```

使用代理时添加 `--use-proxy` 参数即可。

## 故障排除

### 连接超时 (Connection timeout)

**症状**: 出现 `Connection timeout to host https://discord.com/api/v10/users/@me` 错误

**解决方案**:
1. **使用SOCKS5代理**（推荐）：添加 `--use-proxy` 参数
   ```bash
   python scrape_discord_messages.py -c 1329891599861415949 -l 100 --use-proxy
   ```
2. 检查网络连接是否正常
3. 确认可以访问Discord网站

### 找不到频道

- 确认channel ID正确
- 确认bot已加入该服务器
- 确认bot有查看频道和读取消息历史的权限

### Token错误

- 检查token是否有效
- 尝试使用不同的token索引 `-t` 参数

### 下载媒体失败

- 检查网络连接
- 如果使用代理，确保已添加 `--use-proxy` 参数
- 某些媒体链接可能已过期
