# Khmer Sonic AI on this Windows PC, for free: builds + runs the app and opens a
# public https link with a Cloudflare quick tunnel (no account needed). Open the
# link in any browser (browser-demo mode is on). If you give a Telegram bot
# token, it also points the bot's menu button at the fresh link so it opens
# inside Telegram. The link changes on every start — this re-points the bot each
# time. Start with run_pc.bat (double-click). Keep the window open to keep it up.

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root
$Port = 3100
New-Item -ItemType Directory -Force -Path "$Root\logs", "$Root\tools" | Out-Null

function Say($m) { Write-Host "`n==> $m" -ForegroundColor Cyan }
function Warn($m) { Write-Host "!! $m" -ForegroundColor Yellow }
function Have($c) { [bool](Get-Command $c -ErrorAction SilentlyContinue) }
function Refresh-Path {
  $env:Path = [Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' + [Environment]::GetEnvironmentVariable('Path', 'User')
}
function Winget-Install($id) {
  if (-not (Have 'winget')) { throw "winget is missing — install '$id' by hand, then run again." }
  winget install --id $id -e --accept-source-agreements --accept-package-agreements --silent | Out-Host
  Refresh-Path
}
function Read-Env($file) {
  $vals = @{}
  if (Test-Path $file) {
    foreach ($line in Get-Content $file -Encoding UTF8) {
      if ($line -match '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$') { $vals[$Matches[1]] = $Matches[2].Trim().Trim('"') }
    }
  }
  return $vals
}
function Set-EnvValue($file, $key, $value) {
  $lines = @()
  if (Test-Path $file) { $lines = @(Get-Content $file -Encoding UTF8 | Where-Object { $_ -notmatch "^\s*$key\s*=" }) }
  $lines += "$key=$value"
  $lines | Set-Content -Path $file -Encoding UTF8
}

# ── Tools (Node only — no Python/FFmpeg needed) ──────────────────────────────
Say 'Checking Node.js'
if (-not (Have 'node')) { Winget-Install 'OpenJS.NodeJS.LTS' }
if (-not (Have 'node')) { throw 'Node was installed but this window cannot see it yet — close it and double-click run_pc.bat again.' }

# ── Settings (.env) ──────────────────────────────────────────────────────────
$envFile = "$Root\.env"
if (-not (Test-Path $envFile)) {
  Say 'First run: settings (press Enter to skip any of these)'
  $bot = Read-Host 'Telegram bot token from @BotFather (Enter = browser only)'
  @(
    "PORT=$Port",
    '# Browser-demo on: open the link in any browser and it works (mock data).',
    'ALLOW_BROWSER_DEMO=on',
    "TELEGRAM_BOT_TOKEN=$bot"
  ) | Set-Content -Path $envFile -Encoding UTF8
  Write-Host "Saved to $envFile (edit it with Notepad any time)."
}
$cfg = Read-Env $envFile
if ($cfg['ALLOW_BROWSER_DEMO'] -ne 'on') { Set-EnvValue $envFile 'ALLOW_BROWSER_DEMO' 'on'; $cfg['ALLOW_BROWSER_DEMO'] = 'on' }
if (-not $cfg['PORT']) { Set-EnvValue $envFile 'PORT' "$Port"; $cfg['PORT'] = "$Port" }
$Port = [int]$cfg['PORT']

# ── Install + build the web app ──────────────────────────────────────────────
if (-not (Test-Path "$Root\node_modules")) {
  Say 'Installing packages (first time 1-3 min)'
  npm install --no-audit --no-fund | Out-Host
  if ($LASTEXITCODE -ne 0) { throw 'npm install failed — see the messages above' }
}
# Rebuild when the source changed (version = git HEAD, or newest source file).
$head = $null
if (Test-Path "$Root\.git") { try { $head = (git -C $Root rev-parse HEAD 2>$null) } catch { $head = $null } }
if (-not $head) {
  $newest = Get-ChildItem "$Root\web\src", "$Root\web\index.html", "$Root\web\package.json" -Recurse -File -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTimeUtc -Descending | Select-Object -First 1
  $head = if ($newest) { "files-$($newest.LastWriteTimeUtc.Ticks)" } else { 'files' }
}
$buildMark = "$Root\logs\.built_head"
if (-not (Test-Path "$Root\web\dist") -or -not (Test-Path $buildMark) -or (Get-Content $buildMark) -ne $head) {
  Say 'Building the web app'
  npm run build | Out-Host
  if ($LASTEXITCODE -ne 0) { throw 'npm run build failed — see the messages above' }
  Set-Content $buildMark $head
}

# ── Cloudflare tunnel program ────────────────────────────────────────────────
$cf = "$Root\tools\cloudflared.exe"
function Test-Exe($path) {
  if (-not (Test-Path $path)) { return $false }
  try { $out = & $path --version 2>&1 | Out-String; return ($LASTEXITCODE -eq 0 -and $out -match 'cloudflared') } catch { return $false }
}
if (-not (Test-Exe $cf)) {
  Say 'Downloading cloudflared (free https link, ~40 MB)'
  if (Test-Path $cf) { Remove-Item $cf -Force }
  $part = "$Root\tools\cloudflared-download.exe"
  if (Test-Path $part) { Remove-Item $part -Force }
  $ProgressPreference = 'SilentlyContinue'
  Invoke-WebRequest -UseBasicParsing -OutFile $part 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe'
  if (-not (Test-Exe $part)) { throw 'cloudflared download is incomplete — check the internet and run again.' }
  Move-Item $part $cf -Force
}

# ── Start ────────────────────────────────────────────────────────────────────
$procs = @()
try {
  if (Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue) {
    throw "Port $Port is already in use — close the other window using it first."
  }
  Say 'Starting Khmer Sonic AI'
  $env:PORT = "$Port"
  $env:ALLOW_BROWSER_DEMO = 'on'
  if ($cfg['TELEGRAM_BOT_TOKEN']) { $env:TELEGRAM_BOT_TOKEN = $cfg['TELEGRAM_BOT_TOKEN'] }
  $app = Start-Process -FilePath 'node' -ArgumentList 'server/src/index.js' -WorkingDirectory $Root `
    -RedirectStandardOutput "$Root\logs\app.log" -RedirectStandardError "$Root\logs\app.err.log" -NoNewWindow -PassThru
  $procs += $app
  $up = $false
  for ($i = 0; $i -lt 45 -and -not $up; $i++) {
    Start-Sleep 1
    if ($app.HasExited) { break }
    try { Invoke-WebRequest -UseBasicParsing -TimeoutSec 3 "http://127.0.0.1:$Port/api/health" | Out-Null; $up = $true } catch {}
  }
  if (-not $up) { Get-Content "$Root\logs\app.err.log" -Tail 25 -ErrorAction SilentlyContinue | Out-Host; throw 'The app did not start — see logs\app.err.log above.' }

  Say 'Opening the free https link'
  $tunnelLog = "$Root\logs\tunnel.log"
  if (Test-Path $tunnelLog) { Remove-Item $tunnelLog -Force }
  $tunnel = Start-Process -FilePath $cf -ArgumentList 'tunnel', '--no-autoupdate', '--url', "http://127.0.0.1:$Port" `
    -RedirectStandardError $tunnelLog -RedirectStandardOutput "$Root\logs\tunnel.out.log" -NoNewWindow -PassThru
  $procs += $tunnel
  $url = $null
  for ($i = 0; $i -lt 60 -and -not $url; $i++) {
    Start-Sleep 1
    if (Test-Path $tunnelLog) {
      $m = Select-String -Path $tunnelLog -Pattern 'https://(?!api\.)[a-z0-9-]+\.trycloudflare\.com' -ErrorAction SilentlyContinue | Select-Object -First 1
      if ($m) { $url = $m.Matches[0].Value }
    }
  }
  if (-not $url) { Get-Content $tunnelLog -Tail 20 -ErrorAction SilentlyContinue | Out-Host; throw 'No https link from Cloudflare — check the internet connection and run again.' }

  # If a bot token is set, point the bot's menu button (☰) at the fresh link so
  # it opens the Mini App inside Telegram. This re-points on every run.
  $bot = $cfg['TELEGRAM_BOT_TOKEN']
  if ($bot) {
    Say 'Pointing the Telegram bot menu button at the link'
    try {
      $body = @{ menu_button = @{ type = 'web_app'; text = '🎵 Khmer Song'; web_app = @{ url = "$url/" } } } | ConvertTo-Json -Depth 6
      $r = Invoke-RestMethod -Method Post -Uri "https://api.telegram.org/bot$bot/setChatMenuButton" -ContentType 'application/json; charset=utf-8' -Body $body
      if ($r.ok) { Write-Host '   Done — open the bot, tap the ☰ menu button to launch it.' -ForegroundColor Green }
      else { Warn "Telegram did not accept the menu button: $($r.description)" }
    } catch { Warn "Could not set the bot menu button: $($_.Exception.Message)" }
  }

  try { Set-Clipboard $url } catch {}
  Write-Host ''
  Write-Host '=========================================================' -ForegroundColor Green
  Write-Host "  Khmer Sonic AI is running:  $url" -ForegroundColor Green
  Write-Host '  (copied to the clipboard — open it in any browser)' -ForegroundColor Green
  if ($bot) { Write-Host '  In Telegram: open the bot and tap the menu button (bottom-left).' -ForegroundColor Green }
  Write-Host '  Keep this window open. Close it to stop.' -ForegroundColor Green
  Write-Host '=========================================================' -ForegroundColor Green
  Start-Process $url

  while ($true) {
    Start-Sleep 5
    if ($app.HasExited) { Warn 'The app stopped — see logs\app.err.log'; break }
    if ($tunnel.HasExited) { Warn 'The https link stopped — run run_pc.bat again for a new one'; break }
  }
} finally {
  foreach ($p in $procs) { if ($p -and -not $p.HasExited) { Stop-Process -Id $p.Id -Force -ErrorAction SilentlyContinue } }
}
