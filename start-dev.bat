@echo off
title MITS Library Management System - Dev Server
echo Starting MITS Library Management System on http://localhost:5173 ...
set PATH=%~dp0node-env;%PATH%
.\node-env\node.exe .\node_modules\vite\bin\vite.js --host
pause
