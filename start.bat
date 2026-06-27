@echo off
REM RasCloud Server - Quick Start Script for Windows (PowerShell / CMD)
REM Usage: start.bat [port]

cd /d "%~dp0"

REM Check for Node.js
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Node.js is not installed.
    echo.
    echo Download and install it from: https://nodejs.org
    pause
    exit /b 1
)

REM Install dependencies if needed
if not exist "node_modules" (
    echo Installing dependencies...
    npm install
    if %ERRORLEVEL% NEQ 0 (
        echo ERROR: Failed to install dependencies.
        pause
        exit /b 1
    )
)

REM Set port from argument
if not "%~1"=="" (
    set PORT=%~1
)

echo Starting RasCloud Server...
node server.js
pause
