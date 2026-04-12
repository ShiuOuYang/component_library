@echo off
REM WIP Distribution Docker 管理腳本

echo ================================
echo WIP Distribution Docker 管理
echo ================================
echo.

:menu
echo 請選擇操作：
echo 1. 構建 Docker 映像
echo 2. 啟動服務
echo 3. 停止服務
echo 4. 重新構建並啟動
echo 5. 查看日誌
echo 6. 查看狀態
echo 7. 清理所有容器和映像
echo 8. 啟動帶 Nginx 的完整服務
echo 9. 退出
echo.

set /p choice=請輸入選項 (1-9): 

if "%choice%"=="1" goto build
if "%choice%"=="2" goto start
if "%choice%"=="3" goto stop
if "%choice%"=="4" goto rebuild
if "%choice%"=="5" goto logs
if "%choice%"=="6" goto status
if "%choice%"=="7" goto cleanup
if "%choice%"=="8" goto start_with_nginx
if "%choice%"=="9" goto exit

echo 無效選項，請重新選擇
goto menu

:build
echo 正在構建 Docker 映像...
docker-compose build
goto menu

:start
echo 正在啟動服務...
docker-compose up -d
echo 服務已啟動，可在 http://localhost:5012 訪問
goto menu

:stop
echo 正在停止服務...
docker-compose down
goto menu

:rebuild
echo 正在重新構建並啟動服務...
docker-compose down
docker-compose build --no-cache
docker-compose up -d
echo 服務已重新啟動，可在 http://localhost:5012 訪問
goto menu

:logs
echo 顯示日誌...
docker-compose logs -f wip-distribution
goto menu

:status
echo 服務狀態：
docker-compose ps
goto menu

:cleanup
echo 正在清理所有容器和映像...
docker-compose down --rmi all --volumes --remove-orphans
docker system prune -f
echo 清理完成
goto menu

:start_with_nginx
echo 正在啟動完整服務（包含 Nginx）...
docker-compose --profile nginx up -d
echo 服務已啟動：
echo - 應用: http://localhost:5012
echo - Nginx: http://localhost:80
goto menu

:exit
echo 退出管理腳本
exit /b 0
