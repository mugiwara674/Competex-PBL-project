@echo off
title CompeteX - Academic Submission Packager
echo ===================================================
echo   CompeteX - MBU PBL Submission Packager
echo   Mohan Babu University - Course 22IT104001
echo ===================================================
echo Packaging submission bundle into ZIP archive...
echo.

if exist "%~dp0bin\node.exe" (
    "%~dp0bin\node.exe" "%~dp0package_submission.js"
) else (
    node "%~dp0package_submission.js"
)

echo.
pause
