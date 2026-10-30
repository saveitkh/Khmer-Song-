@echo off
REM Khmer Sonic AI on this PC (free): builds + runs the app and opens a public
REM https link (Cloudflare quick tunnel). Open the link in any browser; if you
REM set a bot token it also works inside Telegram.
REM Double-click to start. Keep the window open; close it to stop.
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\run_pc.ps1"
echo.
pause
