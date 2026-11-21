# Export the generated Veilora artwork into application PNG and Windows ICO assets.
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$repoRoot = Split-Path $PSScriptRoot -Parent
$source = [System.Drawing.Image]::FromFile((Join-Path $repoRoot 'assets/brand/veilora.png'))
function Export-BrandPng([int]$size) {
    $bitmap = [System.Drawing.Bitmap]::new($size, $size)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.Clear([System.Drawing.Color]::Transparent)
    $graphics.DrawImage($source, 0, 0, $size, $size)
    $stream = [System.IO.MemoryStream]::new()
    $bitmap.Save($stream, [System.Drawing.Imaging.ImageFormat]::Png)
    $bytes = $stream.ToArray()
    $graphics.Dispose(); $bitmap.Dispose(); $stream.Dispose()
    return ,$bytes
}
try {
    foreach ($target in @('assets/appicon.png','build/appicon.png','vpn-mobile/assets/images/icon.png')) {
        [System.IO.File]::WriteAllBytes((Join-Path $repoRoot $target), (Export-BrandPng 1024))
    }
    [System.IO.File]::WriteAllBytes((Join-Path $repoRoot 'frontend/src/assets/veilora.png'), (Export-BrandPng 128))
    $sizes = @(16,24,32,48,64,128,256)
    $images = @($sizes | ForEach-Object { ,(Export-BrandPng $_) })
    $stream = [System.IO.MemoryStream]::new()
    $writer = [System.IO.BinaryWriter]::new($stream)
    $writer.Write([uint16]0); $writer.Write([uint16]1); $writer.Write([uint16]$sizes.Count)
    $offset = 6 + 16 * $sizes.Count
    for ($i = 0; $i -lt $sizes.Count; $i++) {
        $dimension = if ($sizes[$i] -eq 256) { 0 } else { $sizes[$i] }
        $writer.Write([byte]$dimension); $writer.Write([byte]$dimension)
        $writer.Write([byte]0); $writer.Write([byte]0)
        $writer.Write([uint16]1); $writer.Write([uint16]32)
        $writer.Write([uint32]$images[$i].Length); $writer.Write([uint32]$offset)
        $offset += $images[$i].Length
    }
    foreach ($bytes in $images) { $writer.Write([byte[]]$bytes) }
    foreach ($target in @('build/windows/icon.ico','internal/systray/logo.ico','assets/shield.ico')) {
        [System.IO.File]::WriteAllBytes((Join-Path $repoRoot $target), $stream.ToArray())
    }
    [System.IO.File]::WriteAllBytes((Join-Path $repoRoot 'assets/shield.png'), (Export-BrandPng 256))
    $writer.Dispose(); $stream.Dispose()
} finally { $source.Dispose() }
