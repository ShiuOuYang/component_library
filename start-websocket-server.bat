@echo off
echo 啟動 WebSocket 測試伺服器...
echo.
echo 請確保已安裝 Node.js 和 ws 套件
echo 如果未安裝 ws，請執行: npm install ws
echo.
echo WebSocket 伺服器將在 ws://localhost:8080/yield-monitor 啟動
echo 按 Ctrl+C 停止伺服器
echo.
pause
node websocket-server.js
