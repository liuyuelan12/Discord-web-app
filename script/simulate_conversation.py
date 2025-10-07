#!/usr/bin/env python3
"""
Discord对话模拟脚本
使用多个token轮换发送历史消息，维护回复关系
"""

import asyncio
import aiohttp
import aiohttp_socks
import json
import csv
import argparse
import random
import ssl
import io
import urllib.parse
from pathlib import Path
from typing import List, Dict, Optional

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

class ConversationSimulator:
    def __init__(self, tokens: List[str], use_proxy: bool = True, base_dir: str = None, 
                 reaction_chance: float = 0.0, reply_chance: float = 0.0):
        """
        初始化对话模拟器
        
        Args:
            tokens: Discord token列表
            use_proxy: 是否使用代理
            base_dir: CSV文件所在的基础目录
            reaction_chance: 添加表情反应的概率 (0-100)
            reply_chance: 随机回复的概率 (0-100)
        """
        self.tokens = tokens
        self.current_token_index = 0
        self.use_proxy = use_proxy
        self.proxy_url = None
        self.message_id_map = {}  # 旧消息ID -> 新消息ID的映射
        self.base_dir = Path(base_dir) if base_dir else Path.cwd()
        self.reaction_chance = reaction_chance
        self.reply_chance = reply_chance
        self.sent_message_ids = []  # 记录已发送的消息ID（按顺序）
        
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
    
    def get_current_token(self) -> str:
        """获取当前token（不轮换）"""
        return self.tokens[self.current_token_index]
    
    async def create_session(self) -> aiohttp.ClientSession:
        """创建HTTP会话"""
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
    
    async def send_message(
        self, 
        session: aiohttp.ClientSession, 
        channel_id: str, 
        content: str,
        reply_to_message_id: Optional[str] = None,
        attachment_paths: List[str] = None,
        _token: Optional[str] = None
    ) -> Optional[str]:
        """
        发送消息
        
        Args:
            session: HTTP会话
            channel_id: 频道ID
            content: 消息内容
            reply_to_message_id: 回复的消息ID（可选）
            attachment_paths: 附件路径列表（可选）
            _token: 内部使用的token（用于重试）
            
        Returns:
            新消息的ID，失败返回None
        """
        token = _token if _token else self.get_next_token()
        
        # 如果有附件，使用multipart/form-data
        if attachment_paths:
            # 验证并读取附件
            files_to_send = []
            for attachment_path in attachment_paths:
                file_path = self.base_dir / attachment_path
                if file_path.exists():
                    try:
                        with open(file_path, 'rb') as f:
                            file_data = f.read()
                            files_to_send.append({
                                'data': file_data,
                                'filename': file_path.name
                            })
                    except Exception as e:
                        print(f"  ⚠️  读取附件失败 {file_path}: {e}")
                else:
                    print(f"  ⚠️  附件不存在: {file_path}")
            
            # 如果没有成功读取任何文件，回退到纯文本
            if not files_to_send:
                print(f"  ⚠️  没有可用的附件，发送纯文本")
                if content:
                    return await self.send_message(session, channel_id, content, reply_to_message_id, None, token)
                else:
                    print(f"  ❌ 没有内容和附件可发送")
                    return None
            
            # 构建 FormData
            form = aiohttp.FormData()
            
            # 构建 payload
            payload = {}
            if content:
                payload['content'] = content
            if reply_to_message_id:
                payload['message_reference'] = {'message_id': reply_to_message_id}
            
            # 只有在 payload 不为空时才添加（Discord 不接受空的 payload_json）
            if payload:
                # 不指定 content_type，让 aiohttp 自动处理
                form.add_field('payload_json', json.dumps(payload))
            
            # 添加文件（使用 BytesIO 来包装）
            for idx, file_info in enumerate(files_to_send):
                file_stream = io.BytesIO(file_info['data'])
                form.add_field(
                    f'files[{idx}]',
                    file_stream,
                    filename=file_info['filename'],
                    content_type='application/octet-stream'
                )
            
            try:
                async with session.post(
                    f'{DISCORD_API_BASE}/channels/{channel_id}/messages',
                    headers={'Authorization': token},
                    data=form
                ) as response:
                    if response.status == 200 or response.status == 201:
                        data = await response.json()
                        return data['id']
                    else:
                        error_text = await response.text()
                        print(f"  ❌ 发送失败 (状态码: {response.status}): {error_text}")
                        # 如果附件发送失败，尝试纯文本（使用同一个token）
                        if content:
                            print(f"  🔄 尝试降级为纯文本发送...")
                            return await self.send_message(session, channel_id, content, reply_to_message_id, None, token)
                        return None
            except Exception as e:
                print(f"  ❌ 发送失败: {e}")
                # 如果附件发送失败，尝试纯文本（使用同一个token）
                if content:
                    print(f"  🔄 尝试降级为纯文本发送...")
                    return await self.send_message(session, channel_id, content, reply_to_message_id, None, token)
                return None
        else:
            # 纯文本消息，使用JSON
            payload = {'content': content}
            
            if reply_to_message_id:
                payload['message_reference'] = {
                    'message_id': reply_to_message_id
                }
            
            try:
                async with session.post(
                    f'{DISCORD_API_BASE}/channels/{channel_id}/messages',
                    headers={'Authorization': token},
                    json=payload
                ) as response:
                    if response.status == 200 or response.status == 201:
                        data = await response.json()
                        return data['id']
                    else:
                        error_text = await response.text()
                        print(f"  ❌ 发送失败 (状态码: {response.status}): {error_text}")
                        return None
            except Exception as e:
                print(f"  ❌ 发送失败: {e}")
                return None
    
    async def add_reaction(
        self,
        session: aiohttp.ClientSession,
        channel_id: str,
        message_id: str,
        emoji: str,
        token: str = None
    ) -> bool:
        """
        给消息添加表情反应
        
        Args:
            session: HTTP会话
            channel_id: 频道ID
            message_id: 消息ID
            emoji: 表情（如 '👍', '❤️', '😂'）
            token: 使用的token
            
        Returns:
            是否成功
        """
        if not token:
            token = self.get_next_token()
        
        # URL编码emoji
        encoded_emoji = urllib.parse.quote(emoji)
        
        try:
            async with session.put(
                f'{DISCORD_API_BASE}/channels/{channel_id}/messages/{message_id}/reactions/{encoded_emoji}/@me',
                headers={'Authorization': token}
            ) as response:
                if response.status == 204:
                    return True
                else:
                    error_text = await response.text()
                    print(f"  ❌ 添加反应失败 (状态码: {response.status}): {error_text}")
                    return False
        except Exception as e:
            print(f"  ❌ 添加反应失败: {e}")
            return False
    
    def read_messages_from_csv(self, csv_path: str) -> List[Dict]:
        """从CSV读取消息"""
        messages = []
        with open(csv_path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                messages.append(row)
        return messages
    
    async def simulate_conversation(
        self,
        channel_id: str,
        csv_path: str,
        min_delay: int = 30,
        max_delay: int = 60,
        loop: bool = True
    ):
        """
        模拟对话
        
        Args:
            channel_id: 频道ID
            csv_path: CSV文件路径
            min_delay: 最小发送间隔（秒）
            max_delay: 最大发送间隔（秒）
            loop: 是否循环发送
        """
        print(f'\n开始模拟对话...')
        print(f'频道ID: {channel_id}')
        print(f'CSV文件: {csv_path}')
        print(f'发送间隔: {min_delay}-{max_delay}秒')
        print(f'循环模式: {"是" if loop else "否"}')
        print(f'Token数量: {len(self.tokens)}\n')
        
        # 读取消息
        messages = self.read_messages_from_csv(csv_path)
        print(f'共读取 {len(messages)} 条消息\n')
        
        round_count = 0
        
        while True:
            round_count += 1
            
            # 每轮随机选择起始位置
            start_index = random.randint(0, max(0, len(messages) - 1))
            
            if loop:
                print(f'========== 第 {round_count} 轮 ==========')
                print(f'📍 从第 {start_index + 1} 条消息开始 (共 {len(messages)} 条)\n')
            else:
                print(f'📍 从第 {start_index + 1} 条消息开始 (共 {len(messages)} 条)\n')
            
            success_count = 0
            fail_count = 0
            
            # 每轮重置消息ID映射和已发送消息列表
            self.message_id_map = {}
            self.sent_message_ids = []
            
            # 常用表情列表
            reactions = ['👍', '❤️', '😂', '🔥', '💯', '🎉', '👏', '✅', '💪', '🙌']
            
            # 从随机位置开始遍历到末尾
            messages_to_send = messages[start_index:]
            
            async with await self.create_session() as session:
                for i, message in enumerate(messages_to_send):
                    # 调整索引显示（显示在原数组中的位置）
                    actual_index = start_index + i
                    old_message_id = message.get('消息ID', '')
                    content = message.get('内容', '').strip()
                    attachment_paths_str = message.get('附件路径', '').strip()
                    
                    # 解析附件路径
                    attachment_paths = []
                    if attachment_paths_str:
                        attachment_paths = [p.strip() for p in attachment_paths_str.split('|') if p.strip()]
                    
                    # 跳过完全空的消息
                    if not content and not attachment_paths:
                        print(f"[{actual_index + 1}/{len(messages)}] 跳过空消息")
                        continue
                    
                    # 消息类型
                    message_type = "发送消息"
                    if attachment_paths:
                        message_type += f" [{len(attachment_paths)}个附件]"
                    
                    display_content = content[:50] if content else "[仅附件]"
                    
                    # 检查是否要添加表情反应（对上数第3条消息）
                    if self.reaction_chance > 0 and random.random() * 100 < self.reaction_chance:
                        if len(self.sent_message_ids) >= 3:
                            target_message_id = self.sent_message_ids[-3]
                            reaction_emoji = random.choice(reactions)
                            current_token = self.get_current_token()
                            
                            print(f"[{actual_index + 1}/{len(messages)}] 添加反应 {reaction_emoji} (跳过发送): {display_content}...")
                            
                            if await self.add_reaction(session, channel_id, target_message_id, reaction_emoji, current_token):
                                print(f"  ✅ 已添加反应到上数第3条消息")
                            
                            # 轮换到下一个token（因为当前token用于了添加反应）
                            self.get_next_token()
                            
                            # 等待随机时间
                            delay = random.uniform(min_delay, max_delay)
                            print(f"  ⏳ 等待 {int(delay)} 秒...\n")
                            await asyncio.sleep(delay)
                            continue  # 跳过发送这条消息
                    
                    # 检查是否要作为回复（回复上数第5条消息）
                    reply_to_id = None
                    if self.reply_chance > 0 and random.random() * 100 < self.reply_chance:
                        if len(self.sent_message_ids) >= 5:
                            reply_to_id = self.sent_message_ids[-5]
                            message_type += " [回复上数第5条]"
                    
                    print(f"[{actual_index + 1}/{len(messages)}] {message_type}: {display_content}...")
                    
                    # 发送消息
                    new_message_id = await self.send_message(
                        session, 
                        channel_id, 
                        content,
                        reply_to_id,
                        attachment_paths
                    )
                    
                    if new_message_id:
                        print(f"  ✅ 已发送 (ID: {new_message_id})")
                        success_count += 1
                        
                        # 保存到已发送消息列表
                        self.sent_message_ids.append(new_message_id)
                        
                        # 保存消息ID映射
                        if old_message_id:
                            self.message_id_map[old_message_id] = new_message_id
                    else:
                        print(f"  ❌ 发送失败")
                        fail_count += 1
                    
                    # 等待随机间隔后再发送下一条
                    if i < len(messages_to_send) - 1:
                        delay = random.uniform(min_delay, max_delay)
                        print(f"  ⏳ 等待 {int(delay)} 秒...\n")
                        await asyncio.sleep(delay)
                    else:
                        print()
            
            print(f'\n========== 第 {round_count} 轮完成 ==========')
            print(f'成功: {success_count} 条')
            print(f'失败: {fail_count} 条\n')
            
            if not loop:
                break
            
            # 如果循环，等待一段时间后重新开始
            wait_time = random.randint(60, 120)
            print(f'等待 {wait_time} 秒后开始下一轮...\n')
            await asyncio.sleep(wait_time)

async def main():
    parser = argparse.ArgumentParser(description='Discord对话模拟脚本')
    parser.add_argument('-c', '--channel', required=True, help='目标频道ID')
    parser.add_argument('-f', '--file', required=True, help='CSV文件路径')
    parser.add_argument('--min-delay', type=int, default=30, help='最小发送间隔(秒，默认30)')
    parser.add_argument('--max-delay', type=int, default=60, help='最大发送间隔(秒，默认60)')
    parser.add_argument('--no-loop', action='store_true', help='只执行一次，不循环')
    parser.add_argument('--no-proxy', action='store_true', help='不使用代理')
    parser.add_argument('--reaction-chance', type=float, default=0.0, 
                       help='添加表情反应的概率 (0-100)，默认0')
    parser.add_argument('--reply-chance', type=float, default=0.0,
                       help='随机回复的概率 (0-100)，默认0')
    
    args = parser.parse_args()
    
    # 读取tokens
    import os
    token_file = os.environ.get('SIMULATE_TOKEN_FILE', 'Discord_Token.json')
    token_path = Path(token_file)
    try:
        if not token_path.is_absolute():
            token_path = Path(__file__).parent / token_path
        
        with open(token_path, 'r', encoding='utf-8') as f:
            token_data = json.load(f)
            tokens = token_data if isinstance(token_data, list) else [token_data]
        print(f'✓ 已加载 {len(tokens)} 个token')
    except Exception as e:
        print(f'❌ 读取token文件失败: {e}')
        return
    
    # 检查CSV文件
    csv_path = Path(args.file)
    if not csv_path.is_absolute():
        csv_path = Path(__file__).parent / csv_path
    
    if not csv_path.exists():
        print(f'❌ CSV文件不存在: {csv_path}')
        return
    
    # 创建模拟器
    use_proxy = USE_PROXY_BY_DEFAULT
    if args.no_proxy:
        use_proxy = False
    
    if use_proxy:
        if CONFIG_AVAILABLE and PROXY_CONFIGS:
            print(f"✓ 已启用SOCKS5代理: {PROXY_CONFIGS[0]['addr']}:{PROXY_CONFIGS[0]['port']}")
        elif 'CONFIG' in globals() and CONFIG:
            print(f"✓ 已启用SOCKS5代理: {CONFIG['proxy']['host']}:{CONFIG['proxy']['port']}")
    
    # 获取CSV文件所在目录作为base_dir
    base_dir = csv_path.parent
    simulator = ConversationSimulator(
        tokens, 
        use_proxy, 
        str(base_dir),
        args.reaction_chance,
        args.reply_chance
    )
    
    if args.reaction_chance > 0:
        print(f"✓ 表情反应概率: {args.reaction_chance}%")
    if args.reply_chance > 0:
        print(f"✓ 随机回复概率: {args.reply_chance}%")
    
    # 开始模拟对话
    try:
        await simulator.simulate_conversation(
            args.channel,
            str(csv_path),
            args.min_delay,
            args.max_delay,
            not args.no_loop
        )
    except KeyboardInterrupt:
        print('\n\n⚠️  用户中断')
    except Exception as e:
        print(f'\n❌ 运行出错: {e}')
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    asyncio.run(main())
