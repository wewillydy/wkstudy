import asyncio, sys
sys.path.insert(0, r"D:\project\douxue\Douyin_TikTok_Download_API")

class S: pass
S.chrome = S.firefox = S.edge = S.chromium = S.opera = S.brave = lambda: []
sys.modules["browser_cookie3"] = S

import yaml
from crawlers.douyin.web.web_crawler import DouyinWebCrawler
print("DouyinWebCrawler imported OK")

async def test():
    c = DouyinWebCrawler()
    with open(r"D:\project\douxue\Douyin_TikTok_Download_API\crawlers\douyin\web\config.yaml", "r", encoding="utf-8") as f:
        cfg = yaml.safe_load(f)
    cookie = cfg["TokenManager"]["douyin"]["headers"].get("Cookie", "")
    print(f"Cookie length: {len(cookie)} chars")
    required = ["ttwid", "odin_tt", "passport_csrf_token"]
    for r in required:
        print(f"  Has {r}: {r in cookie}")

asyncio.run(test())
