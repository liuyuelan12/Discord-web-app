#!/usr/bin/env python3
"""
Discord Token验证脚本
测试Discord_Token.json中的所有token是否有效
"""

import asyncio
import json
import aiohttp
import ssl
from aiohttp_socks import ProxyConnector
from datetime import datetime

# 导入配置
from config import (
    PROXY_CONFIGS,
    USE_PROXY_BY_DEFAULT,
    DISCORD_API_BASE,
    REQUEST_TIMEOUT,
    get_proxy_url
)


async def test_token(token: str, index: int, use_proxy: bool = USE_PROXY_BY_DEFAULT, max_retries: int = 3) -> dict:
    """
    测试单个token是否有效
    
    Args:
        token: Discord token
        index: token索引
        use_proxy: 是否使用代理
        max_retries: 最大重试次数
        
    Returns:
        包含测试结果的字典
    """
    result = {
        'index': index,
        'token': f"{token[:20]}...{token[-10:]}",  # 只显示部分token
        'valid': False,
        'user_info': None,
        'error': None,
        'retries': 0
    }
    
    # 重试机制
    for attempt in range(max_retries):
        try:
            result['retries'] = attempt
            
            # 创建SSL上下文（禁用验证）
            ssl_context = ssl.create_default_context()
            ssl_context.check_hostname = False
            ssl_context.verify_mode = ssl.CERT_NONE
            
            # 根据是否使用代理创建connector
            if use_proxy and PROXY_CONFIGS:
                proxy_config = PROXY_CONFIGS[0]
                proxy_url = f"socks5://{proxy_config['username']}:{proxy_config['password']}@{proxy_config['addr']}:{proxy_config['port']}"
                connector = ProxyConnector.from_url(proxy_url, ssl=ssl_context)
            else:
                connector = aiohttp.TCPConnector(ssl=ssl_context)
            
            # 发送请求验证token
            async with aiohttp.ClientSession(connector=connector) as session:
                headers = {
                    'Authorization': token,
                    'Content-Type': 'application/json'
                }
                
                async with session.get(
                    f'{DISCORD_API_BASE}/users/@me',
                    headers=headers,
                    ssl=ssl_context,
                    timeout=aiohttp.ClientTimeout(total=REQUEST_TIMEOUT)
                ) as response:
                    if response.status == 200:
                        data = await response.json()
                        result['valid'] = True
                        result['user_info'] = {
                            'username': data.get('username'),
                            'id': data.get('id'),
                            'discriminator': data.get('discriminator', '0'),
                            'email': data.get('email', 'N/A'),
                            'verified': data.get('verified', False),
                            'mfa_enabled': data.get('mfa_enabled', False)
                        }
                        return result  # 成功则立即返回
                    elif response.status == 401:
                        result['error'] = 'Token无效或已过期'
                        return result  # Token无效，无需重试
                    else:
                        result['error'] = f'HTTP {response.status}: {await response.text()}'
                        # 其他错误继续重试
                        
        except asyncio.TimeoutError:
            result['error'] = '连接超时'
            if attempt < max_retries - 1:
                await asyncio.sleep(1)  # 重试前等待1秒
        except Exception as e:
            result['error'] = f'{type(e).__name__}: {str(e)}'
            if attempt < max_retries - 1:
                await asyncio.sleep(1)  # 重试前等待1秒
    
    return result


async def test_all_tokens(token_file: str, use_proxy: bool = USE_PROXY_BY_DEFAULT):
    """
    测试所有token
    
    Args:
        token_file: token文件路径
        use_proxy: 是否使用代理
    """
    print("=" * 80)
    print("Discord Token 验证工具")
    print("=" * 80)
    print()
    
    # 读取token文件
    try:
        with open(token_file, 'r', encoding='utf-8') as f:
            tokens = json.load(f)
        print(f"✓ 已加载 {len(tokens)} 个token")
    except Exception as e:
        print(f"❌ 读取token文件失败: {e}")
        return
    
    if use_proxy:
        print(f"✓ 使用SOCKS5代理: {PROXY_CONFIGS[0]['addr']}:{PROXY_CONFIGS[0]['port']}")
    else:
        print("⚠️  不使用代理（可能导致连接超时）")
    
    print()
    print("开始测试token...\n")
    
    # 测试所有token
    results = []
    for idx, token in enumerate(tokens):
        print(f"[{idx + 1}/{len(tokens)}] 测试 Token {idx}...", end=" ", flush=True)
        result = await test_token(token, idx, use_proxy)
        results.append(result)
        
        if result['valid']:
            print(f"✅ 有效 (重试{result['retries']}次)")
        else:
            print(f"❌ 无效 (重试{result['retries']}次)")
    
    # 打印详细结果
    print("\n" + "=" * 80)
    print("详细测试结果")
    print("=" * 80)
    print()
    
    valid_count = 0
    invalid_count = 0
    
    for result in results:
        print(f"Token {result['index']}:")
        print(f"  Token片段: {result['token']}")
        
        if result['valid']:
            valid_count += 1
            user = result['user_info']
            print(f"  状态: ✅ 有效")
            print(f"  用户名: {user['username']}#{user['discriminator']}")
            print(f"  用户ID: {user['id']}")
            print(f"  邮箱: {user['email']}")
            print(f"  已验证: {'是' if user['verified'] else '否'}")
            print(f"  启用MFA: {'是' if user['mfa_enabled'] else '否'}")
        else:
            invalid_count += 1
            print(f"  状态: ❌ 无效")
            print(f"  错误: {result['error']}")
        
        print()
    
    # 打印汇总
    print("=" * 80)
    print("测试汇总")
    print("=" * 80)
    print(f"总计: {len(results)} 个token")
    print(f"✅ 有效: {valid_count} 个")
    print(f"❌ 无效: {invalid_count} 个")
    print()
    
    # 列出可用的token索引
    if valid_count > 0:
        valid_indices = [r['index'] for r in results if r['valid']]
        print(f"💡 可用的token索引: {', '.join(map(str, valid_indices))}")
        print(f"\n使用示例:")
        print(f"  python scrape_discord_messages.py -c CHANNEL_ID -l 500 --use-proxy -t {valid_indices[0]}")
    else:
        print("⚠️  没有找到有效的token")
        print("\n请检查:")
        print("  1. Token是否已过期")
        print("  2. Token格式是否正确")
        print("  3. 网络连接是否正常")
    
    print()


async def main():
    import argparse
    
    parser = argparse.ArgumentParser(description='Discord Token验证工具')
    
    parser.add_argument(
        '--token-file',
        default='/Users/Zhuanz/Desktop/Discord Bot/Discord_Token.json',
        help='Token文件路径 (默认: Discord_Token.json)'
    )
    
    parser.add_argument(
        '--use-proxy',
        action='store_true',
        default=USE_PROXY_BY_DEFAULT,  # 使用配置文件的默认值
        help=f'使用SOCKS5代理 (默认: {"启用" if USE_PROXY_BY_DEFAULT else "禁用"})'
    )
    
    parser.add_argument(
        '--no-proxy',
        action='store_true',
        help='禁用代理（覆盖默认设置）'
    )
    
    args = parser.parse_args()
    
    # 如果指定了 --no-proxy，则禁用代理
    use_proxy = args.use_proxy and not args.no_proxy
    
    await test_all_tokens(args.token_file, use_proxy)


if __name__ == '__main__':
    asyncio.run(main())
