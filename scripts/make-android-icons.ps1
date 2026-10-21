# 用 build/icon.png 生成 Android 各密度启动图标
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$srcPath = Join-Path $root 'build\icon.png'
$res = Join-Path $root 'android\app\src\main\res'
if (-not (Test-Path $srcPath)) { throw "missing $srcPath" }
if (-not (Test-Path $res)) { throw "missing $res, run 'npx cap add android' first" }

$src = [System.Drawing.Image]::FromFile($srcPath)
$sizes = @{ 'mdpi' = 48; 'hdpi' = 72; 'xhdpi' = 96; 'xxhdpi' = 144; 'xxxhdpi' = 192 }

foreach ($density in $sizes.Keys) {
  $px = $sizes[$density]
  $dir = Join-Path $res "mipmap-$density"
  New-Item -ItemType Directory -Force -Path $dir | Out-Null
  $bmp = New-Object System.Drawing.Bitmap($px, $px)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $g.DrawImage($src, 0, 0, $px, $px)
  $bmp.Save((Join-Path $dir 'ic_launcher.png'), [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Save((Join-Path $dir 'ic_launcher_round.png'), [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose()
  $bmp.Dispose()
}

# 删除 adaptive icon 配置，强制使用上面的 PNG（避免 Capacitor 默认图标覆盖）
Get-ChildItem $res -Directory -Filter 'mipmap-anydpi-v26' -ErrorAction SilentlyContinue | Remove-Item -Recurse -Force

$src.Dispose()
Write-Host 'Android icons updated.'
