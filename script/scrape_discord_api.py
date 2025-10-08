#!/usr/bin/env python3
"""
Discord消息爬取脚本 (使用REST API)
用于爬取Discord频道的历史消息，包括文本、图片、GIF、sticker、emoji等
"""

import asyncio
import json
import csv
import os
import argparse
import aiohttp
import ssl
import re
from aiohttp_socks import ProxyConnector
from datetime import datetime
from pathlib import Path
from typing import Optional, List, Dict, Tuple

# 导入配置
from config import (
    PROXY_CONFIGS, 
    USE_PROXY_BY_DEFAULT, 
    DISCORD_API_BASE,
    REQUEST_TIMEOUT,
    RATE_LIMIT_DELAY,
    get_proxy_url
)


def parse_discord_url(url: str) -> Optional[Tuple[str, str]]:
    """
    解析Discord频道URL
    
    Args:
        url: Discord URL，格式如 https://discord.com/channels/SERVER_ID/CHANNEL_ID
        
    Returns:
        (guild_id, channel_id) 或 None
    """
    pattern = r'discord\.com/channels/(\d+)/(\d+)'
    match = re.search(pattern, url)
    if match:
        return (match.group(1), match.group(2))
    return None


class DiscordAPIScraper:
    def __init__(self, token: str, output_base_dir: str, use_proxy: bool = USE_PROXY_BY_DEFAULT):
        """
        初始化Discord API爬取器
        
        Args:
            token: Discord用户token
            output_base_dir: 输出基础目录
            use_proxy: 是否使用代理
        """
        self.token = token
        self.output_base_dir = output_base_dir
        self.use_proxy = use_proxy
        self.session = None
        
        # 创建SSL上下文
        self.ssl_context = ssl.create_default_context()
        self.ssl_context.check_hostname = False
        self.ssl_context.verify_mode = ssl.CERT_NONE
        
        # 创建connector
        if use_proxy and PROXY_CONFIGS:
            proxy_config = PROXY_CONFIGS[0]
            proxy_url = f"socks5://{proxy_config['username']}:{proxy_config['password']}@{proxy_config['addr']}:{proxy_config['port']}"
            self.connector = ProxyConnector.from_url(proxy_url, ssl=self.ssl_context)
            print(f"✓ 已启用SOCKS5代理: {proxy_config['addr']}:{proxy_config['port']}")
        else:
            self.connector = aiohttp.TCPConnector(ssl=self.ssl_context)
    
    async def __aenter__(self):
        """创建session"""
        self.session = aiohttp.ClientSession(connector=self.connector)
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """关闭session"""
        if self.session:
            await self.session.close()
    
    async def get_guilds_and_channels(self):
        """获取用户所有服务器和频道"""
        headers = {
            'Authorization': self.token,
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
        
        try:
            # 获取用户的所有服务器
            async with self.session.get(
                f"{DISCORD_API_BASE}/users/@me/guilds",
                headers=headers,
                ssl=self.ssl_context
            ) as response:
                if response.status != 200:
                    print(f"❌ 获取服务器列表失败: {response.status}")
                    return []
                
                guilds = await response.json()
            
            result = []
            for guild in guilds:
                # 获取每个服务器的频道
                async with self.session.get(
                    f"{DISCORD_API_BASE}/guilds/{guild['id']}/channels",
                    headers=headers,
                    ssl=self.ssl_context
                ) as response:
                    if response.status == 200:
                        channels = await response.json()
                        # 只获取文字频道 (type 0)
                        text_channels = [ch for ch in channels if ch.get('type') == 0]
                        for channel in text_channels:
                            result.append({
                                'guild_name': guild['name'],
                                'channel_name': channel['name'],
                                'channel_id': channel['id']
                            })
                    await asyncio.sleep(0.5)  # 避免 rate limit
            
            return result
        except Exception as e:
            print(f"❌ 获取频道列表失败: {e}")
            return []
    
    async def check_channel_access(self, guild_id: str, channel_id: str) -> Tuple[bool, str]:
        """
        检查token是否有权限访问指定频道
        
        Args:
            guild_id: 服务器ID
            channel_id: 频道ID
            
        Returns:
            (has_access: bool, message: str)
        """
        headers = {
            'Authorization': self.token,
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
        
        try:
            # 检查是否在服务器中
            async with self.session.get(
                f"{DISCORD_API_BASE}/users/@me/guilds",
                headers=headers,
                ssl=self.ssl_context
            ) as response:
                if response.status != 200:
                    return False, f"无法获取服务器列表 (状态码: {response.status})"
                
                guilds = await response.json()
                guild_ids = [g['id'] for g in guilds]
                
                if guild_id not in guild_ids:
                    return False, "❌ Token未加入此服务器"
            
            # 检查是否有权限访问频道
            async with self.session.get(
                f"{DISCORD_API_BASE}/channels/{channel_id}",
                headers=headers,
                ssl=self.ssl_context
            ) as response:
                if response.status == 403:
                    return False, "❌ 无此频道的访问权限"
                elif response.status == 404:
                    return False, "❌ 频道不存在"
                elif response.status != 200:
                    return False, f"❌ 检查频道失败 (状态码: {response.status})"
                
                channel_data = await response.json()
                channel_name = channel_data.get('name', 'Unknown')
                guild_name_id = channel_data.get('guild_id', '')
                
                return True, f"✓ 有权限访问频道 #{channel_name}"
        
        except Exception as e:
            return False, f"❌ 检查权限时出错: {e}"
    
    async def get_messages(self, channel_id: str, limit: int) -> List[Dict]:
        """
        获取频道消息
        
        Args:
            channel_id: 频道ID
            limit: 获取消息数量
            
        Returns:
            消息列表
        """
        messages = []
        before_id = None
        
        headers = {
            'Authorization': self.token,
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
        
        print(f"开始获取消息...")
        
        while len(messages) < limit:
            # 每次最多获取100条
            batch_limit = min(100, limit - len(messages))
            
            url = f"{DISCORD_API_BASE}/channels/{channel_id}/messages"
            params = {'limit': batch_limit}
            
            if before_id:
                params['before'] = before_id
            
            try:
                async with self.session.get(
                    url,
                    headers=headers,
                    params=params,
                    ssl=self.ssl_context
                ) as response:
                    if response.status == 200:
                        batch = await response.json()
                        
                        if not batch:
                            break
                        
                        messages.extend(batch)
                        before_id = batch[-1]['id']
                        
                        print(f"已获取 {len(messages)}/{limit} 条消息")
                        
                        # 避免触发rate limit（增加延迟）
                        await asyncio.sleep(RATE_LIMIT_DELAY)
                    elif response.status == 429:
                        # Rate limit
                        retry_after = (await response.json()).get('retry_after', 1)
                        print(f"触发rate limit，等待 {retry_after} 秒...")
                        await asyncio.sleep(retry_after)
                    else:
                        error_text = await response.text()
                        print(f"❌ API错误 {response.status}: {error_text}")
                        break
            except Exception as e:
                print(f"⚠️  请求失败: {e}, 等待3秒后重试...")
                await asyncio.sleep(3)
                # 不立即 break，让循环继续尝试
        
        return messages
    
    async def download_media(self, url: str, save_path: str) -> bool:
        """
        下载媒体文件
        
        Args:
            url: 媒体文件URL
            save_path: 保存路径
            
        Returns:
            是否下载成功
        """
        try:
            async with self.session.get(url, ssl=self.ssl_context) as response:
                if response.status == 200:
                    with open(save_path, 'wb') as f:
                        f.write(await response.read())
                    return True
        except Exception as e:
            print(f"下载媒体文件失败 {url}: {e}")
        return False
    
    def get_server_info(self, channel_id: str, config_path: str) -> Optional[Dict]:
        """
        从配置文件获取服务器信息
        
        Args:
            channel_id: 频道ID
            config_path: 配置文件路径
            
        Returns:
            服务器信息字典
        """
        try:
            with open(config_path, 'r', encoding='utf-8') as f:
                config = json.load(f)
            
            for server in config['servers']:
                for channel_key, channel_info in server['channels'].items():
                    if channel_info['channel_id'] == channel_id:
                        return {
                            'server_name': server['server_name'],
                            'channel_name': channel_info['name'],
                            'channel_key': channel_key
                        }
        except Exception as e:
            print(f"读取配置文件失败: {e}")
        return None
    
    async def scrape_and_save(self, channel_id: str, limit: int):
        """
        爬取并保存消息
        
        Args:
            channel_id: 频道ID
            limit: 爬取消息数量
        """
        # 从API获取频道信息
        headers = {
            'Authorization': self.token,
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
        
        try:
            async with self.session.get(
                f"{DISCORD_API_BASE}/channels/{channel_id}",
                headers=headers,
                ssl=self.ssl_context
            ) as response:
                if response.status == 200:
                    channel_data = await response.json()
                    channel_name = channel_data.get('name', f'channel_{channel_id}')
                    guild_id = channel_data.get('guild_id')
                    
                    # 获取服务器名称
                    server_name = f'Server_{guild_id}'
                    if guild_id:
                        async with self.session.get(
                            f"{DISCORD_API_BASE}/guilds/{guild_id}",
                            headers=headers,
                            ssl=self.ssl_context
                        ) as guild_response:
                            if guild_response.status == 200:
                                guild_data = await guild_response.json()
                                server_name = guild_data.get('name', server_name)
                else:
                    channel_name = f'channel_{channel_id}'
                    server_name = f'Server_{channel_id}'
        except Exception as e:
            print(f"⚠️  无法获取频道信息，使用默认名称: {e}")
            channel_name = f'channel_{channel_id}'
            server_name = f'Server_{channel_id}'
        
        print(f"\n频道: {channel_name}")
        print(f"服务器: {server_name}")
        
        # 创建输出目录
        server_dir = Path(self.output_base_dir) / server_name
        media_dir = server_dir / 'media'
        server_dir.mkdir(parents=True, exist_ok=True)
        media_dir.mkdir(exist_ok=True)
        
        # CSV文件路径
        csv_path = server_dir / f"{channel_name}_messages.csv"
        
        # 获取消息
        messages = await self.get_messages(channel_id, limit)
        
        if not messages:
            print("❌ 未获取到任何消息")
            return
        
        print(f"\n✓ 共获取 {len(messages)} 条消息")
        print(f"开始处理消息和下载媒体...\n")
        
        # 反转消息列表（按时间正序）
        messages.reverse()
        
        # 写入CSV
        with open(csv_path, 'w', newline='', encoding='utf-8-sig') as csvfile:
            fieldnames = [
                '消息ID', '时间戳', '内容',
                '附件数量', '附件路径', 'Stickers',
                '回复消息ID', '嵌入内容数量'
            ]
            writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
            writer.writeheader()
            
            for idx, message in enumerate(messages, 1):
                print(f"处理消息 {idx}/{len(messages)}...", end='\r')
                
                # 下载附件
                attachment_paths = []
                for attachment in message.get('attachments', []):
                    # 生成文件名
                    file_ext = Path(attachment['filename']).suffix
                    file_name = f"{message['id']}_{attachment['id']}{file_ext}"
                    file_path = media_dir / file_name
                    
                    # 下载文件
                    if await self.download_media(attachment['url'], str(file_path)):
                        attachment_paths.append(f"media/{file_name}")
                
                # 提取stickers
                stickers = [sticker['name'] for sticker in message.get('sticker_items', [])]
                
                # 提取时间戳
                timestamp = message.get('timestamp', '')
                if timestamp:
                    timestamp = datetime.fromisoformat(timestamp.replace('Z', '+00:00')).strftime('%Y-%m-%d %H:%M:%S')
                
                # 写入CSV行
                writer.writerow({
                    '消息ID': message['id'],
                    '时间戳': timestamp,
                    '内容': message.get('content', ''),
                    '附件数量': len(attachment_paths),
                    '附件路径': '|'.join(attachment_paths),
                    'Stickers': '|'.join(stickers),
                    '回复消息ID': message.get('message_reference', {}).get('message_id', ''),
                    '嵌入内容数量': len(message.get('embeds', []))
                })
        
        print(f"\n\n✅ 爬取完成！")
        print(f"数据保存位置: {server_dir}")
        print(f"- CSV文件: {csv_path}")
        print(f"- 媒体文件: {media_dir}")


def list_channels(config_path: str):
    """列出所有可用的频道"""
    try:
        with open(config_path, 'r', encoding='utf-8') as f:
            config = json.load(f)
        
        print("\n可用的频道列表：\n")
        print(f"{'索引':<6} {'服务器':<20} {'频道':<20} {'Channel ID'}")
        print("-" * 80)
        
        index = 0
        for server in config['servers']:
            for channel_key, channel_info in server['channels'].items():
                print(f"{index:<6} {server['server_name']:<20} {channel_info['name']:<20} {channel_info['channel_id']}")
                index += 1
        
        print("\n使用方式:")
        print("  1. 使用索引: -c 0")
        print("  2. 使用服务器+频道: -c 'fightid general'")
        print("  3. 使用Channel ID: -c 1329891599861415949\n")
        
    except Exception as e:
        print(f"❌ 读取配置文件失败: {e}")


def resolve_channel_id(channel_input: str, config_path: str) -> Optional[str]:
    """
    解析频道输入为channel ID
    
    Args:
        channel_input: 频道输入（索引/名称/ID）
        config_path: 配置文件路径
        
    Returns:
        频道ID，如果找不到返回None
    """
    try:
        with open(config_path, 'r', encoding='utf-8') as f:
            config = json.load(f)
        
        # 尝试作为索引解析
        if channel_input.isdigit():
            index = int(channel_input)
            current_index = 0
            for server in config['servers']:
                for channel_key, channel_info in server['channels'].items():
                    if current_index == index:
                        print(f"✓ 解析为: {server['server_name']} > {channel_info['name']}")
                        return channel_info['channel_id']
                    current_index += 1
        
        # 尝试作为 "server channel" 格式解析
        parts = channel_input.lower().split()
        if len(parts) >= 2:
            server_keyword = parts[0]
            channel_keyword = ' '.join(parts[1:])
            
            for server in config['servers']:
                if server_keyword in server['server_name'].lower():
                    for channel_key, channel_info in server['channels'].items():
                        if channel_keyword in channel_info['name'].lower() or channel_keyword in channel_key.lower():
                            print(f"✓ 解析为: {server['server_name']} > {channel_info['name']}")
                            return channel_info['channel_id']
        
        # 尝试作为channel ID（如果是数字且长度合适）
        if channel_input.isdigit() and len(channel_input) > 10:
            return channel_input
        
    except Exception as e:
        print(f"❌ 解析频道失败: {e}")
    
    return None


async def main():
    parser = argparse.ArgumentParser(
        description='Discord消息爬取工具 (REST API)',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  # 使用Discord URL
  python scrape_discord_api.py -u "https://discord.com/channels/1234567890/9876543210" -l 100
  
  # 使用Channel ID
  python scrape_discord_api.py -c 1329891599861415949 -l 500
  
  # 列出所有可访问的频道
  python scrape_discord_api.py --list
  
  # 不使用代理
  python scrape_discord_api.py -u "https://discord.com/channels/xxx/xxx" --no-proxy
        """
    )
    
    parser.add_argument(
        '-u', '--url',
        help='Discord频道URL，格式: https://discord.com/channels/SERVER_ID/CHANNEL_ID'
    )
    
    parser.add_argument(
        '-c', '--channel',
        help='频道ID (可选，如果不使用URL)'
    )
    
    parser.add_argument(
        '--list',
        action='store_true',
        help='列出所有可用的频道'
    )
    
    parser.add_argument(
        '-l', '--limit',
        type=int,
        default=100,
        help='爬取的消息数量 (默认: 100)'
    )
    
    parser.add_argument(
        '-t', '--token-index',
        type=int,
        default=0,
        help='使用的token索引 (默认: 0)'
    )
    
    parser.add_argument(
        '--token-file',
        default='/Users/Zhuanz/Desktop/Discord Bot/Discord_Token.json',
        help='Token文件路径'
    )
    
    parser.add_argument(
        '-o', '--output-dir',
        default='/Users/Zhuanz/Desktop/Discord Bot/发言脚本',
        help='输出目录'
    )
    
    parser.add_argument(
        '--no-proxy',
        action='store_true',
        help='不使用SOCKS5代理（默认使用代理）'
    )
    
    args = parser.parse_args()
    
    # 处理 --list 选项
    if args.list:
        # 如果提供了 token-file，通过 API 获取频道
        if args.token_file:
            try:
                with open(args.token_file, 'r', encoding='utf-8') as f:
                    tokens = json.load(f)
                
                if not tokens:
                    print("❌ Token文件为空")
                    return
                
                token_index = args.token_index if args.token_index is not None else 0
                if token_index >= len(tokens):
                    print(f"❌ Token索引 {token_index} 超出范围 (共{len(tokens)}个token)")
                    return
                
                token = tokens[token_index]
                print(f"使用第 {token_index} 个token")
                
                use_proxy = not args.no_proxy
                
                # 直接在 main 中使用 await（main 本身已经是 async 函数）
                async with DiscordAPIScraper(token, '.', use_proxy) as scraper:
                    print("\n获取频道列表...\n")
                    channels = await scraper.get_guilds_and_channels()
                    
                    if not channels:
                        print("❌ 未找到任何频道")
                        return
                    
                    print(f"\n找到 {len(channels)} 个频道:\n")
                    print(f"{'服务器':<30} {'频道':<30} {'ID'}")
                    print("-" * 90)
                    
                    for ch in channels:
                        print(f"  📝 {ch['guild_name']:<28} {ch['channel_name']:<28} (ID: {ch['channel_id']})")
                    
                    print()
                
                return
            except Exception as e:
                print(f"❌ 获取频道列表失败: {e}")
                return
    
    # 检查是否提供了URL或频道ID
    if not args.url and not args.channel:
        parser.error("需要提供 -u/--url 或 -c/--channel 参数，或使用 --list 列出频道")
    
    # 解析频道ID和服务器ID
    guild_id = None
    channel_id = None
    
    if args.url:
        # 从URL解析
        parsed = parse_discord_url(args.url)
        if not parsed:
            print(f"\n❌ 无效的Discord URL: {args.url}")
            print("URL格式应为: https://discord.com/channels/SERVER_ID/CHANNEL_ID\n")
            return
        guild_id, channel_id = parsed
        print(f"✓ 从URL解析: 服务器ID={guild_id}, 频道ID={channel_id}")
    elif args.channel:
        # 直接使用频道ID
        channel_id = args.channel
        print(f"✓ 使用频道ID: {channel_id}")
    
    if not channel_id:
        print("\n❌ 无法确定频道ID\n")
        return
    
    # 读取token
    try:
        with open(args.token_file, 'r', encoding='utf-8') as f:
            tokens = json.load(f)
        
        if args.token_index >= len(tokens):
            print(f"❌ Token索引超出范围。共有 {len(tokens)} 个token，索引应为 0-{len(tokens)-1}")
            return
        
        token = tokens[args.token_index]
        print(f"使用第 {args.token_index} 个token")
        
    except Exception as e:
        print(f"❌ 读取token文件失败: {e}")
        return
    
    # 创建爬取器并检查权限
    use_proxy = not args.no_proxy  # 默认使用代理
    try:
        async with DiscordAPIScraper(token, args.output_dir, use_proxy) as scraper:
            # 如果有guild_id，检查权限
            if guild_id:
                print(f"\n正在检查频道访问权限...")
                has_access, message = await scraper.check_channel_access(guild_id, channel_id)
                print(message)
                
                if not has_access:
                    return
            
            # 执行爬取
            print(f"\n开始爬取频道 {channel_id} 的消息 (最多 {args.limit} 条)...\n")
            await scraper.scrape_and_save(channel_id, args.limit)
    except KeyboardInterrupt:
        print("\n\n⚠️  用户中断")
    except Exception as e:
        print(f"\n❌ 运行出错: {e}")
        import traceback
        traceback.print_exc()


if __name__ == '__main__':
    asyncio.run(main())
