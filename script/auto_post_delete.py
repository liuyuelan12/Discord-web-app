#!/usr/bin/env python3
"""
Discord秒删机器人并秒删脚本
按照CSV文件顺序发送消息，发送后立即删除
"""

import asyncio
import aiohttp
import aiohttp_socks
import json
import csv
import argparse
from pathlib import Path
from typing import List, Dict

# 导入统一配置
try:
    from config import (
        PROXY_CONFIGS,
        USE_PROXY_BY_DEFAULT,
        DISCORD_API_BASE,
        get_proxy_url
    )
    CONFIG_AVAILABLE = True
except ImportError:
    # 兼容旧的 config.json
    def load_config():
        config_path = Path(__file__).parent / 'config.json'
        try:
            with open(config_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            return None
    
    CONFIG = load_config()
    DISCORD_API_BASE = CONFIG['discord']['apiBase'] if CONFIG else 'https://discord.com/api/v10'
    USE_PROXY_BY_DEFAULT = True
    PROXY_CONFIGS = []
    CONFIG_AVAILABLE = False

class AutoPoster:
    def __init__(self, tokens: List[str], use_proxy: bool = True):
        self.tokens = tokens
        self.current_token_index = 0
        self.use_proxy = use_proxy
        self.proxy_url = None
        
        if use_proxy:
            if CONFIG_AVAILABLE and PROXY_CONFIGS:
                # 使用 config.py 的配置
                self.proxy_url = get_proxy_url()
            elif 'CONFIG' in globals() and CONFIG:
                # 使用 config.json 的配置
                proxy_config = CONFIG['proxy']
                self.proxy_url = f"socks5://{proxy_config['username']}:{proxy_config['password']}@{proxy_config['host']}:{proxy_config['port']}"
    
    def get_next_token(self) -> str:
        """轮换获取下一个token"""
        token = self.tokens[self.current_token_index]
        self.current_token_index = (self.current_token_index + 1) % len(self.tokens)
        return token
    
    async def create_session(self) -> aiohttp.ClientSession:
        """创建HTTP会话"""
        import ssl
        
        # 创建SSL上下文，禁用证书验证
        ssl_context = ssl.create_default_context()
        ssl_context.check_hostname = False
        ssl_context.verify_mode = ssl.CERT_NONE
        
        if self.proxy_url:
            connector = aiohttp_socks.ProxyConnector.from_url(
                self.proxy_url,
                ssl=ssl_context
            )
        else:
            connector = aiohttp.TCPConnector(ssl=ssl_context)
        
        return aiohttp.ClientSession(
            connector=connector,
            timeout=aiohttp.ClientTimeout(total=30),
            headers={
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
                'Accept': '*/*',
                'Accept-Language': 'en-US,en;q=0.9',
            }
        )
    
    async def send_message(self, session: aiohttp.ClientSession, channel_id: str, content: str) -> tuple[str, str]:
        """
        发送消息
        返回: (message_id, token)
        """
        token = self.get_next_token()
        
        try:
            async with session.post(
                f'{DISCORD_API_BASE}/channels/{channel_id}/messages',
                headers={'Authorization': token},
                json={'content': content}
            ) as response:
                if response.status == 200 or response.status == 201:
                    data = await response.json()
                    return data['id'], token
                else:
                    error_text = await response.text()
                    print(f"  ❌ 发送失败 (状态码: {response.status})")
                    return None, token
        except Exception as e:
            print(f"  ❌ 发送失败: {e}")
            return None, token
    
    async def delete_message(self, session: aiohttp.ClientSession, channel_id: str, message_id: str, token: str):
        """删除消息（静默处理错误）"""
        try:
            async with session.delete(
                f'{DISCORD_API_BASE}/channels/{channel_id}/messages/{message_id}',
                headers={'Authorization': token}
            ) as response:
                if response.status == 204:
                    return True
                return False
        except:
            return False
    
    def read_messages_from_csv(self, csv_path: str) -> List[Dict]:
        """从CSV读取消息"""
        messages = []
        with open(csv_path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                messages.append(row)
        return messages
    
    async def auto_post(self, channel_id: str, csv_path: str, message_delay: float = 1.0, delete_delay: float = 0.0):
        """执行秒删机器人"""
        print(f'\n开始秒删机器人...')
        print(f'频道ID: {channel_id}')
        print(f'CSV文件: {csv_path}')
        print(f'消息间隔: {message_delay * 1000}ms')
        print(f'删除延迟: {delete_delay * 1000}ms')
        print(f'Token数量: {len(self.tokens)}\n')
        
        # 读取消息
        messages = self.read_messages_from_csv(csv_path)
        print(f'共读取 {len(messages)} 条消息\n')
        
        success_count = 0
        fail_count = 0
        
        async with await self.create_session() as session:
            for i, message in enumerate(messages):
                content = message.get('内容', '').strip()
                
                if not content:
                    print(f"[{i + 1}/{len(messages)}] 跳过空消息")
                    continue
                
                print(f"[{i + 1}/{len(messages)}] 发送消息: {content[:50]}...")
                
                # 发送消息
                message_id, token = await self.send_message(session, channel_id, content)
                
                if message_id:
                    print(f"  ✅ 已发送 (ID: {message_id})")
                    success_count += 1
                    
                    # 立即发送删除请求（完全不等待，在后台执行）
                    asyncio.ensure_future(
                        self.delete_message(session, channel_id, message_id, token)
                    )
                    print(f"  🗑️  已触发删除\n")
                else:
                    print(f"  ❌ 发送失败\n")
                    fail_count += 1
                
                # 等待间隔后再发送下一条
                if i < len(messages) - 1:
                    await asyncio.sleep(message_delay)
            
            # 等待所有删除任务完成
            await asyncio.sleep(2)
        
        print(f'\n✅ 完成！')
        print(f'成功: {success_count} 条')
        print(f'失败: {fail_count} 条')

async def main():
    parser = argparse.ArgumentParser(description='Discord秒删机器人并秒删脚本')
    parser.add_argument('-c', '--channel', help='目标频道ID (默认使用config.json)')
    parser.add_argument('-f', '--file', help='CSV文件路径 (默认使用config.json)')
    parser.add_argument('-d', '--delay', type=float, help='消息间隔(秒)')
    parser.add_argument('--delete-delay', type=float, default=0.0, help='删除延迟(秒)')
    parser.add_argument('--token-file', help='Token文件路径')
    parser.add_argument('--no-proxy', action='store_true', help='不使用代理')
    
    args = parser.parse_args()
    
    # 从config或命令行获取参数
    channel_id = args.channel or (CONFIG['autoPost']['channelId'] if CONFIG else None)
    csv_file = args.file or (CONFIG['autoPost']['csvFile'] if CONFIG else None)
    message_delay = args.delay if args.delay is not None else (CONFIG['autoPost']['messageDelay'] / 1000 if CONFIG else 1.0)
    delete_delay = args.delete_delay
    token_file = args.token_file or (CONFIG['discord']['tokenFile'] if CONFIG else './Discord_Token.json')
    
    # 验证必要参数
    if not channel_id:
        print('❌ 请在config.json中设置channelId或使用 -c 参数指定频道ID')
        return
    
    if not csv_file:
        print('❌ 请在config.json中设置csvFile或使用 -f 参数指定CSV文件路径')
        return
    
    # 读取tokens
    try:
        token_path = Path(token_file)
        if not token_path.is_absolute():
            token_path = Path(__file__).parent / token_file
        
        with open(token_path, 'r', encoding='utf-8') as f:
            token_data = json.load(f)
            tokens = token_data if isinstance(token_data, list) else [token_data]
        print(f'✓ 已加载 {len(tokens)} 个token')
    except Exception as e:
        print(f'❌ 读取token文件失败: {e}')
        return
    
    # 检查CSV文件
    csv_path = Path(csv_file)
    if not csv_path.is_absolute():
        csv_path = Path(__file__).parent / csv_file
    
    if not csv_path.exists():
        print(f'❌ CSV文件不存在: {csv_path}')
        return
    
    # 创建秒删机器人实例
    use_proxy = USE_PROXY_BY_DEFAULT
    if args.no_proxy:
        use_proxy = False
    
    if use_proxy:
        if CONFIG_AVAILABLE and PROXY_CONFIGS:
            print(f"✓ 已启用SOCKS5代理: {PROXY_CONFIGS[0]['addr']}:{PROXY_CONFIGS[0]['port']}")
        elif 'CONFIG' in globals() and CONFIG:
            print(f"✓ 已启用SOCKS5代理: {CONFIG['proxy']['host']}:{CONFIG['proxy']['port']}")
    
    poster = AutoPoster(tokens, use_proxy)
    
    # 开始秒删机器人
    try:
        await poster.auto_post(str(channel_id), str(csv_path), message_delay, delete_delay)
    except Exception as e:
        print(f'\n❌ 运行出错: {e}')
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    asyncio.run(main())
