@echo off
setlocal
cd /d %~dp0

:: Check if Node.js is installed
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo Error: Node.js is not installed. Please install Node.js to run this system.
    pause
    exit /b
)

:: Reclaim port 3000 from stale node.exe (previous run not closed properly)
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":3000 " ^| findstr LISTENING') do (
    for /f "tokens=1" %%n in ('tasklist /fi "PID eq %%p" ^| findstr /i "node.exe"') do (
        echo Reclaiming port 3000 from stale node.exe (PID %%p^)...
        taskkill /f /pid %%p >nul 2>&1
    )
)

:: Install dependencies if node_modules is missing
if not exist node_modules (
    echo First time setup: Installing dependencies...
    call npm install
)

echo.
echo Starting CSE QBANK Reviewer...
echo The website will open automatically in your browser.
echo.
echo Press Ctrl+C in this window to stop the server.
echo.

:: Wait for the server to answer, then open it
start /b cmd /c "for /l %%i in (1,1,30) do (curl -s --max-time 1 -o nul http://localhost:3000/api/health && start http://localhost:3000 && exit)"

:: Run the dev server
call npm run dev

pause
