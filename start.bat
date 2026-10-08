@echo off
title CompeteX - College Competition Platform
echo ===================================================
echo   CompeteX - College Competition Management Hub
echo ===================================================
echo Starting CompeteX backend server on port 3000...
echo.

if exist "%~dp0bin\node.exe" (
    "%~dp0bin\node.exe" "%~dp0server.js"
) else (
    node "%~dp0server.js"
)

pause
