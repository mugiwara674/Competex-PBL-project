@echo off
title CompeteX - Database Recovery Utility
echo ===================================================
echo   CompeteX - Database Recovery (Section 14.3)
echo ===================================================
echo Restoring latest snapshot to data\db.json...
echo.

if exist "%~dp0bin\node.exe" (
    "%~dp0bin\node.exe" "%~dp0restore.js" %1
) else (
    node "%~dp0restore.js" %1
)

echo.
pause
