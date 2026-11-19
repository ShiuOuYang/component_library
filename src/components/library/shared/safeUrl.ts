/**
 * 使用者輸入的連結是否安全：只接受 http、https、mailto 與站內相對路徑。
 * 擋掉 javascript:、data:、vbscript: 這類會執行程式或夾帶內容的網址，以及 //evil.com 這種協定相對網址。
 */
export function isSafeUrl(url: string): boolean {
  const u = url.trim()
  if (!u) return false
  if (/^(https?:|mailto:)/i.test(u)) return true
  if (u.startsWith('//')) return false
  // 有其他 scheme（javascript:、data:…）的一律不收；沒有 scheme 的是站內路徑或錨點
  return !/^[a-z][a-z0-9+.-]*:/i.test(u)
}
