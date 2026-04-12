@echo off
echo 正在啟動 WIP 管理系統開發環境...
echo.

echo 步驟 1: 檢查 Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ 未找到 Node.js，請先安裝 Node.js
    pause
    exit /b 1
)
echo ✅ Node.js 已安裝

echo.
echo 步驟 2: 啟動模擬 API 伺服器...
start "Mock API Server" cmd /k "cd mock-server && npm install && npm start"

echo.
echo 步驟 3: 等待 API 伺服器啟動...
timeout /t 3 /nobreak >nul

echo.
echo 步驟 4: 啟動前端開發伺服器...
start "Frontend Dev Server" cmd /k "npm run dev"

echo.
echo ✅ 開發環境啟動完成！
echo.
echo 📊 前端應用: http://localhost:5176
echo 🔧 API 伺服器: http://localhost:3000
echo 🧪 API 測試: http://localhost:5176/api-test
echo.
echo 按任意鍵關閉此視窗...
pause >nul
