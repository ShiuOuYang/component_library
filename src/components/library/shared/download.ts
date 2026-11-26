/**
 * 觸發瀏覽器下載一個 Blob。
 *
 * 原本圖表、標籤設計器、組織圖、設備日誌、Excel 匯出各寫一份，其中三份在 click() 後立刻
 * revokeObjectURL：部分瀏覽器（Firefox、Safari）此時還沒開始讀取，會下載失敗或改用預設檔名。
 * 這裡統一：連結先放進文件（Firefox 需要）、延遲一秒再釋放網址。
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.rel = 'noopener'
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  a.remove()
  // 讓瀏覽器有時間開始下載再釋放
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
