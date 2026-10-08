@echo off
title CompeteX - Automated Quality Assurance Suite
echo ===================================================
echo   CompeteX - System Verification Suite (15 Tests)
echo   MBU Web Technologies (22IT104001)
echo ===================================================
echo.

if exist "%~dp0bin\node.exe" (
    "%~dp0bin\node.exe" "%~dp0test_suite.js"
) else (
    node "%~dp0test_suite.js"
)

echo.
pause
