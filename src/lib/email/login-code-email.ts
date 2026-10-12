export function loginCodeEmailSubject(lang: 'en' | 'ar' = 'en'): string {
  return lang === 'ar' ? 'رمز تسجيل الدخول إلى GetSuitel' : 'Your GetSuitel sign-in code'
}

export function loginCodeEmailHtml(name: string, code: string, minutes: number, lang: 'en' | 'ar' = 'en'): string {
  const isAr = lang === 'ar'
  const greeting = isAr
    ? `عزيزي ${name || 'المستخدم'},<br><br>استخدم الرمز التالي لإكمال تسجيل الدخول من جهاز أو متصفح جديد.`
    : `Dear ${name || 'User'},<br><br>Use this code to finish signing in from a new browser or device.`
  const note = isAr
    ? `الرمز صالح لمدة ${minutes} دقائق. إذا لم تحاول تسجيل الدخول، فقم بتغيير كلمة المرور فوراً ولا تشارك هذا الرمز مع أحد.`
    : `This code expires in ${minutes} minutes. If this wasn't you, change your password right away and never share this code.`
  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 20px"><tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
<tr><td style="background:#1B3A6B;padding:28px 32px">
  <div style="font-size:22px;font-weight:900;color:#fff">Get<span style="color:#C9931A">Suitel</span></div>
  <div style="font-size:12px;color:rgba(255,255,255,0.6);margin-top:4px">${loginCodeEmailSubject(lang)}</div>
</td></tr>
<tr><td style="padding:32px" ${isAr ? 'dir="rtl"' : ''}>
  <div style="font-size:15px;color:#334155;margin-bottom:24px;line-height:1.6">${greeting}</div>
  <div style="text-align:center;margin:28px 0">
    <span style="display:inline-block;background:#f1f5f9;color:#1B3A6B;font-weight:800;font-size:34px;letter-spacing:10px;padding:16px 28px;border-radius:12px;font-family:'Courier New',monospace">${code}</span>
  </div>
  <div style="font-size:12px;color:#94a3b8;text-align:center">${note}</div>
</td></tr>
<tr><td style="background:#f8fafc;padding:16px 32px;border-top:1px solid #e2e8f0">
  <div style="font-size:12px;color:#94a3b8">GetSuitel · Smart Real Estate Management · getsuitel.com</div>
</td></tr></table></td></tr></table></body></html>`
}
