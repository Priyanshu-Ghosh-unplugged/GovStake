@echo off
echo ====================================================
echo Starting TokenScythe System
echo ====================================================
echo Installing dependencies for all workspaces...
call npm install
echo.
echo Starting frontend and backend...
call npm run dev:all
