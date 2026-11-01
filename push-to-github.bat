@echo off
title Push to GitHub - MITS Library Management System
color 0b

echo =====================================================================
echo       MITS COLLEGE, GWALIOR - LIBRARY MANAGEMENT SYSTEM
echo                   GITHUB REPOSITORY PUSH
echo =====================================================================
echo.
echo Target Repository:
echo   https://github.com/ashutoshsharma58234-dotcom/library-management-system.git
echo.
echo GitHub requires authentication to upload code.
echo.
echo [Option 1] Paste your GitHub Personal Access Token (PAT)
echo [Option 2] Press Enter directly to try standard Git sign-in
echo.
set /p TOKEN="Enter GitHub Token (or press Enter): "

if "%TOKEN%"=="" (
    echo.
    echo Attempting push using Git...
    ".\git-env\cmd\git.exe" push -u origin main
) else (
    echo.
    echo Pushing commits using provided Personal Access Token...
    ".\git-env\cmd\git.exe" push -u "https://%TOKEN%@github.com/ashutoshsharma58234-dotcom/library-management-system.git" main
)

echo.
if %ERRORLEVEL% EQU 0 (
    color 0a
    echo =====================================================================
    echo   SUCCESS: All files successfully pushed to GitHub!
    echo   View your repository at:
    echo   https://github.com/ashutoshsharma58234-dotcom/library-management-system
    echo =====================================================================
) else (
    color 0c
    echo =====================================================================
    echo   Push encountered an error.
    echo   Please verify your GitHub token permissions (requires 'repo' scope).
    echo =====================================================================
)

echo.
pause
