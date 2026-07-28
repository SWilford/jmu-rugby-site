param(
  [int]$MaxWidth = 2400,
  [int]$MaxHeight = 1800,
  [long]$JpegQuality = 82
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing

$imageDirectory = [System.IO.Path]::GetFullPath(
  (Join-Path $PSScriptRoot "..\src\assets\home")
)
$workspaceRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))

if (-not $imageDirectory.StartsWith($workspaceRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
  throw "The image directory resolved outside the project workspace."
}

$jpegCodec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() |
  Where-Object { $_.MimeType -eq "image/jpeg" } |
  Select-Object -First 1
$qualityEncoder = [System.Drawing.Imaging.Encoder]::Quality

Get-ChildItem -LiteralPath $imageDirectory -File |
  Where-Object {
    $_.Extension -match "^\.(jpe?g)$" -and $_.Length -gt 2MB
  } |
  ForEach-Object {
    $sourcePath = $_.FullName
    $temporaryPath = "$sourcePath.optimized"
    $sourceImage = [System.Drawing.Image]::FromFile($sourcePath)

    try {
      $widthScale = [double]$MaxWidth / [double]$sourceImage.Width
      $heightScale = [double]$MaxHeight / [double]$sourceImage.Height
      $scale = [Math]::Min(1.0, [Math]::Min($widthScale, $heightScale))
      $targetWidth = [Math]::Max(1, [int][Math]::Round($sourceImage.Width * $scale))
      $targetHeight = [Math]::Max(1, [int][Math]::Round($sourceImage.Height * $scale))
      $bitmap = New-Object System.Drawing.Bitmap($targetWidth, $targetHeight)

      try {
        $bitmap.SetResolution(96, 96)
        $graphics = [System.Drawing.Graphics]::FromImage($bitmap)

        try {
          $graphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceCopy
          $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
          $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
          $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
          $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
          $graphics.DrawImage($sourceImage, 0, 0, $targetWidth, $targetHeight)
        } finally {
          $graphics.Dispose()
        }

        $encoderParameters = New-Object System.Drawing.Imaging.EncoderParameters(1)
        $encoderParameters.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter(
          $qualityEncoder,
          $JpegQuality
        )
        $bitmap.Save($temporaryPath, $jpegCodec, $encoderParameters)
      } finally {
        $bitmap.Dispose()
      }
    } finally {
      $sourceImage.Dispose()
    }

    Move-Item -LiteralPath $temporaryPath -Destination $sourcePath -Force
  }
