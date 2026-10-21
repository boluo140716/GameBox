# 一键构建 Android APK（在已执行 npx cap add android 之后）
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

Write-Host '==> cap sync android'
npx cap sync android
if ($LASTEXITCODE -ne 0) { throw 'cap sync failed' }

Write-Host '==> icons'
powershell -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot 'make-android-icons.ps1')

Write-Host '==> gradle assembleDebug'
Set-Location (Join-Path $root 'android')
.\gradlew.bat assembleDebug
if ($LASTEXITCODE -ne 0) { throw 'gradle build failed' }

$apk = Join-Path $root 'android\app\build\outputs\apk\debug\app-debug.apk'
$outDir = Join-Path $root 'release'
New-Item -ItemType Directory -Force -Path $outDir | Out-Null
Copy-Item $apk (Join-Path $outDir 'GameBox.apk') -Force
Write-Host "APK => $outDir\GameBox.apk"
