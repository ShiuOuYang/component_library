import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const port = process.env.PORT || 5000

// 設置靜態檔案目錄
app.use(express.static(path.join(__dirname, 'dist')))

// 處理 Vue Router 的歷史模式
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'))
})

app.listen(port, () => {
  console.log(`🚀 WIP Distribution server is running on port ${port}`)
  console.log(`🌐 Access at: http://localhost:${port}`)
})
