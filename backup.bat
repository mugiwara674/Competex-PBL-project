@echo off
title CompeteX - Database Backup Utility
echo ===================================================
echo   CompeteX - Database Backup (Section 14.3)
echo ===================================================
echo Running snapshot backup of data\db.json...
echo.

if exist "%~dp0bin\node.exe" (
    "%~dp0bin\node.exe" "%~dp0backup.js"
) else (
    node "%~dp0backup.js"
)

echo.
pause
