import random
import string
import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.header import Header
from app.core.config import get_settings

settings = get_settings()


def generate_code(length: int = 6) -> str:
    return ''.join(random.choices(string.digits, k=length))


async def send_email_code(to_email: str, code: str) -> bool:
    if not settings.SMTP_USER:
        print(f"[DEV] Email code for {to_email}: {code}")
        return True

    msg = MIMEMultipart("alternative")
    from_addr = settings.SMTP_FROM or settings.SMTP_USER
    msg["From"] = from_addr
    msg["To"] = to_email
    msg["Subject"] = Header("名师课堂 - 验证码", "utf-8").encode()

    html = f"""<div style="max-width:480px;margin:40px auto;padding:30px;border-radius:12px;background:#0a0a0a;color:#fff;font-family:Arial,sans-serif">
<h2 style="color:#1f7a4c">名师课堂</h2>
<p>您的验证码是：</p>
<div style="font-size:32px;font-weight:700;letter-spacing:6px;color:#76b900;padding:16px;text-align:center;background:#111;border-radius:8px">{code}</div>
<p style="color:#888;margin-top:20px">验证码 {settings.EMAIL_CODE_EXPIRE_MINUTES} 分钟内有效，请勿泄露给他人。</p>
</div>"""
    msg.attach(MIMEText(html, "html"))

    try:
        if settings.SMTP_PORT == 465:
            await aiosmtplib.send(
                msg,
                hostname=settings.SMTP_HOST,
                port=settings.SMTP_PORT,
                username=settings.SMTP_USER,
                password=settings.SMTP_PASSWORD,
                use_tls=True,
            )
        else:
            await aiosmtplib.send(
                msg,
                hostname=settings.SMTP_HOST,
                port=settings.SMTP_PORT,
                username=settings.SMTP_USER,
                password=settings.SMTP_PASSWORD,
                start_tls=True,
            )
        return True
    except Exception as e:
        print(f"[EMAIL ERROR] {e}")
        return False
