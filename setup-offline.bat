@echo off
rem Offline setup for the vendor/node-modules-win32 branch.
rem Run once after cloning. Needs Node.js 22.19+ but no network access.
rem   1. Rebuild electron.exe from vendor/electron/*.part* (GitHub 100 MB limit)
rem   2. Recreate node_modules\.bin command shims (not stored in git)
setlocal
cd /d "%~dp0"

echo [1/2] Restoring node_modules\electron\dist\electron.exe ...
node scripts\restore-electron.mjs
if errorlevel 1 goto :fail

echo [2/2] Recreating node_modules\.bin ...
call npm rebuild --ignore-scripts --offline
if errorlevel 1 goto :fail

echo.
echo Done. You can now run: npm run dev / npm run build
pause
exit /b 0

:fail
echo.
echo Setup failed. See the messages above.
pause
exit /b 1
