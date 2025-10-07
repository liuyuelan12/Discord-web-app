#!/usr/bin/env python3
"""
Discord Bot 配置文件
存储所有脚本共用的配置，包括代理设置等
"""

# SOCKS5 代理配置
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

# Discord API 配置
DISCORD_API_BASE = "https://discord.com/api/v10"

# 请求超时设置（秒）
REQUEST_TIMEOUT = 10

# Rate Limit 设置
RATE_LIMIT_DELAY = 1.0  # 每个请求之间的延迟（秒）


def get_proxy_url(proxy_config=None):
    """
    获取代理 URL
    
    Args:
        proxy_config: 代理配置字典，如果为 None 则使用默认配置
        
    Returns:
        代理 URL 字符串
    """
    if proxy_config is None and PROXY_CONFIGS:
        proxy_config = PROXY_CONFIGS[0]
    
    if not proxy_config:
        return None
    
    return f"{proxy_config['proxy_type']}://{proxy_config['username']}:{proxy_config['password']}@{proxy_config['addr']}:{proxy_config['port']}"


def get_proxy_config():
    """
    获取第一个代理配置
    
    Returns:
        代理配置字典
    """
    return PROXY_CONFIGS[0] if PROXY_CONFIGS else None
