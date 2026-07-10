export function verificationEmailHtml(name: string, link: string, lang: 'en' | 'ar' = 'en'): string {
  const isAr = lang === 'ar'
  const subject = isAr ? 'التحقق من البريد الإلكتروني' : 'Email Verification'
  const greeting = isAr
    ? `عزيزي ${name || 'المستأجر'},<br><br>يرجى التحقق من عنوان بريدك الإلكتروني لإكمال تسجيلك في GetSuitel والوصول إلى بوابتك.`
    : `Dear ${name || 'Tenant'},<br><br>Please verify your email address to complete your GetSuitel registration and access your portal.`
  const btnText = isAr ? 'تحقق من بريدي الإلكتروني' : 'Verify My Email'
  const disclaimer = isAr
    ? 'هذا الرابط صالح لمدة 24 ساعة. إذا لم تسجّل في GetSuitel، يرجى تجاهل هذه الرسالة.'
    : 'This link expires in 24 hours. If you did not register on GetSuitel, please ignore this email.'

  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 20px">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
<tr><td style="background:#1B3A6B;padding:28px 32px">
  <div style="font-size:22px;font-weight:900;color:#fff">Get<span style="color:#C9931A">Suitel</span></div>
  <div style="font-size:12px;color:rgba(255,255,255,0.6);margin-top:4px">${subject}</div>
</td></tr>
<tr><td style="padding:32px">
  <div style="font-size:15px;color:#334155;margin-bottom:24px;line-height:1.6">${greeting}</div>
  <div style="text-align:center;margin:28px 0">
    <a href="${link}" style="display:inline-block;background:#1B3A6B;color:#fff;font-weight:700;font-size:15px;padding:14px 32px;border-radius:10px;text-decoration:none">${btnText}</a>
  </div>
  <div style="font-size:12px;color:#94a3b8;text-align:center">${disclaimer}</div>
</td></tr>
<tr><td style="background:#f8fafc;padding:16px 32px;border-top:1px solid #e2e8f0">
  <div style="font-size:12px;color:#94a3b8">GetSuitel · Smart Real Estate Management · getsuitel.com</div>
</td></tr>
</table></td></tr></table>
</body></html>`
}

export function verificationEmailSubject(lang: 'en' | 'ar' = 'en'): string {
  return lang === 'ar'
    ? 'تحقق من بريدك الإلكتروني على GetSuitel'
    : 'Verify your GetSuitel email address'
}
