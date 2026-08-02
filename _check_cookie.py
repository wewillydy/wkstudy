import sys
sys.path.insert(0, r"D:\project\douxue\Douyin_TikTok_Download_API")
class S: pass
S.chrome = S.firefox = S.edge = S.chromium = S.opera = S.brave = lambda: []
sys.modules["browser_cookie3"] = S
import yaml
CONFIG_PATH = r"D:\project\douxue\Douyin_TikTok_Download_API\crawlers\douyin\web\config.yaml"
with open(CONFIG_PATH, "r", encoding="utf-8") as f:
    cfg = yaml.safe_load(f)
cookie = cfg["TokenManager"]["douyin"]["headers"].get("Cookie", "")
print(f"Cookie length: {len(cookie)}")
for key in ["ttwid", "odin_tt", "passport_csrf_token", "sessionid"]:
    found = key + "=" in cookie
    print(f"  {key}: {'FOUND' if found else 'MISSING'}")
