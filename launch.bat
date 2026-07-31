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

:: Open the website after a short delay to allow the server to start
start /b cmd /c "timeout /t 5 >nul && start http://localhost:5173"

:: Run the dev server
call npm run dev

pause
