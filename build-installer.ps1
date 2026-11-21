#Requires -Version 5.1
<#
.SYNOPSIS
    Builds the Veilora Desktop Windows installer (.exe) from source.

.DESCRIPTION
    Checks for required tools (Go, Node.js, Task, Wails, NSIS),
    installs any that are missing via winget, then builds the NSIS
    installer for the requested architecture.

.PARAMETER Arch
    Target architecture: amd64 (default) or arm64.

.PARAMETER NoSelfUpdate
    Build the variant without the self-update feature (e.g. for store distribution).

.PARAMETER SkipDepsCheck
    Skip the prerequisite check/install step.

.EXAMPLE
    .\build-installer.ps1
    .\build-installer.ps1 -Arch arm64
    .\build-installer.ps1 -NoSelfUpdate
#>

param(
    [ValidateSet("amd64","arm64")]
    [string] $Arch = "amd64",

    [switch] $NoSelfUpdate,

    [switch] $SkipDepsCheck
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# ──────────────────────────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────────────────────────
function Write-Step([string]$msg) { Write-Host "`n==> $msg" -ForegroundColor Cyan }
function Write-Ok([string]$msg)   { Write-Host "    OK: $msg" -ForegroundColor Green }
function Write-Warn([string]$msg) { Write-Host "    WARN: $msg" -ForegroundColor Yellow }
function Abort([string]$msg)      { Write-Host "`nERROR: $msg" -ForegroundColor Red; exit 1 }

function Test-Command([string]$name) {
    return [bool](Get-Command $name -ErrorAction SilentlyContinue)
}

function Install-ViaWinget([string]$id, [string]$friendlyName) {
    Write-Warn "$friendlyName not found. Installing via winget…"
    if (-not (Test-Command winget)) {
        Abort "winget is not available. Please install $friendlyName manually and re-run this script."
    }
    winget install --id $id --accept-source-agreements --accept-package-agreements -e
    # Refresh PATH for this session
    $env:PATH = [System.Environment]::GetEnvironmentVariable("PATH","Machine") + ";" + `
                [System.Environment]::GetEnvironmentVariable("PATH","User")
}

# ──────────────────────────────────────────────────────────────────────────────
# Prerequisite check & install
# ──────────────────────────────────────────────────────────────────────────────
if (-not $SkipDepsCheck) {
    Write-Step "Checking prerequisites"

    # Go
    if (Test-Command go) {
        $goVer = (go version) -replace 'go version go','' -replace ' .*',''
        Write-Ok "Go $goVer"
    } else {
        Install-ViaWinget "GoLang.Go" "Go"
        if (-not (Test-Command go)) { Abort "Go installation failed. Please install it manually from https://go.dev/dl/" }
    }

    # Node.js (required by Wails frontend build)
    if (Test-Command node) {
        Write-Ok "Node.js $((node --version))"
    } else {
        Install-ViaWinget "OpenJS.NodeJS.LTS" "Node.js"
        if (-not (Test-Command node)) { Abort "Node.js installation failed. Please install it manually from https://nodejs.org/" }
    }

    # Task (taskfile.dev)
    if (Test-Command task) {
        Write-Ok "Task $((task --version))"
    } else {
        Install-ViaWinget "Task.Task" "Task"
        if (-not (Test-Command task)) {
            # Fallback: install via go install
            Write-Warn "Installing Task via 'go install'…"
            go install github.com/go-task/task/v3/cmd/task@latest
        }
    }

    # Wails
    if (Test-Command wails) {
        Write-Ok "Wails $((wails version))"
    } else {
        Write-Warn "Wails not found. Installing via 'go install'…"
        $wailsVer = (go list -m -f '{{.Version}}' github.com/wailsapp/wails/v2 2>$null)
        if (-not $wailsVer) { $wailsVer = "latest" }
        go install "github.com/wailsapp/wails/v2/cmd/wails@$wailsVer"
        # Refresh PATH
        $goPath = (go env GOPATH)
        $env:PATH += ";$goPath\bin"
        if (-not (Test-Command wails)) { Abort "Wails installation failed. See https://wails.io/docs/gettingstarted/installation" }
        Write-Ok "Wails installed"
    }

    # NSIS (makensis) — required for -nsis flag
    $nsisExe = "${env:ProgramFiles(x86)}\NSIS\makensis.exe"
    if (Test-Path $nsisExe) {
        Write-Ok "NSIS found at $nsisExe"
        $env:PATH += ";${env:ProgramFiles(x86)}\NSIS"
    } elseif (Test-Command makensis) {
        Write-Ok "NSIS (makensis) in PATH"
    } else {
        Install-ViaWinget "NSIS.NSIS" "NSIS"
        if (-not (Test-Command makensis) -and -not (Test-Path $nsisExe)) {
            Abort "NSIS not found. Please install it from https://nsis.sourceforge.io/Download and add it to PATH."
        }
        $env:PATH += ";${env:ProgramFiles(x86)}\NSIS"
        Write-Ok "NSIS installed"
    }

    # WebView2 (informational — installed automatically by the NSIS script at user install time)
    Write-Ok "WebView2 runtime will be bundled in the installer via the NSIS script"
}

# ──────────────────────────────────────────────────────────────────────────────
# Build
# ──────────────────────────────────────────────────────────────────────────────
Write-Step "Building Veilora Desktop ($Arch)$(if($NoSelfUpdate){' [no self-update]'})"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Push-Location $scriptDir

try {
    if ($NoSelfUpdate) {
        Write-Host "  Running: task build:prod-noupdate ARCH=$Arch"
        task build:prod-noupdate ARCH=$Arch
        if ($LASTEXITCODE -ne 0) { Abort "Build failed (exit $LASTEXITCODE)" }
        $artifact = "build\bin\Veilora.exe"
    } else {
        Write-Host "  Running: task build:prod ARCH=$Arch"
        task build:prod ARCH=$Arch
        if ($LASTEXITCODE -ne 0) { Abort "Build failed (exit $LASTEXITCODE)" }
        $installer = "build\bin\Veilora-$Arch-installer.exe"
        $artifact  = $installer
    }

    if (-not (Test-Path $artifact)) {
        Abort "Expected output not found: $artifact"
    }

    $fullPath = Resolve-Path $artifact
    Write-Host ""
    Write-Host "================================================================" -ForegroundColor Green
    Write-Host "  BUILD SUCCESSFUL" -ForegroundColor Green
    Write-Host "================================================================" -ForegroundColor Green
    Write-Host "  Output: $fullPath" -ForegroundColor Green
    if (-not $NoSelfUpdate) {
        Write-Host "  This installer includes the WebView2 bootstrapper and will" -ForegroundColor Green
        Write-Host "  install Veilora to %LOCALAPPDATA%\Programs\Veilora Desktop\Veilora." -ForegroundColor Green
    }
    Write-Host "================================================================" -ForegroundColor Green

} finally {
    Pop-Location
}
