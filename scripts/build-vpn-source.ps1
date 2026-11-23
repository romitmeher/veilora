#Requires -Version 5.1
param(
    [ValidateSet('amd64','arm64')][string]$Arch = 'amd64',
    [ValidateSet('openvpn','softether')][string]$Engine = 'openvpn',
    [switch]$CheckPrerequisites
)
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
Push-Location $root
if ($Engine -eq 'softether' -and $Arch -eq 'arm64') {
    throw 'The optional SoftEther source target currently supports AMD64. Its ARM64 hamcore host-tool build is not integrated.'
}
$vswhere = Join-Path ${env:ProgramFiles(x86)} 'Microsoft Visual Studio/Installer/vswhere.exe'
if (-not (Test-Path -LiteralPath $vswhere)) {
    if ($Engine -eq 'openvpn') {
        $installedOpenVPN = Join-Path ${env:ProgramFiles} 'OpenVPN/bin'
        if (Test-Path -LiteralPath (Join-Path $installedOpenVPN 'openvpn.exe')) {
            New-Item -ItemType Directory -Path $stage -ErrorAction SilentlyContinue | Out-Null
            Copy-Item -LiteralPath (Join-Path $installedOpenVPN 'openvpn.exe') -Destination $stage
            Copy-Item -LiteralPath (Join-Path $installedOpenVPN 'tapctl.exe') -Destination $stage
            Get-ChildItem -LiteralPath $installedOpenVPN -Filter '*.dll' -File | Copy-Item -Destination $stage
            @{ engine='openvpn'; arch=$Arch; provenance='installed-local' } | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $stage 'source-build.json') -Encoding UTF8
            Invoke-Checked python @('scripts/prepare-vpn-runtime.py','--allow-installed-openvpn','--arch',$Arch,'--runtime-dir',$stage)
            return
        }
    }
    throw 'Building upstream VPN sources requires Visual Studio 2022 C++ Build Tools. Nothing was installed. Use the Windows CI build or an existing native build environment.'
}
$vs = & $vswhere -latest -products '*' -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath
if (-not $vs) { throw 'Visual Studio C++ tools were not found.' }
$cmake = Join-Path $vs 'Common7/IDE/CommonExtensions/Microsoft/CMake/CMake/bin/cmake.exe'
if (-not (Test-Path -LiteralPath $cmake)) { $cmake = (Get-Command cmake -ErrorAction Stop).Source }
if ($CheckPrerequisites) { Write-Output "Native tools found: $vs"; exit 0 }

function Invoke-Checked([string]$Program, [string[]]$Arguments) {
    & $Program @Arguments
    if ($LASTEXITCODE -ne 0) { throw "$Program failed with exit code $LASTEXITCODE" }
}

try {
    Invoke-Checked git @('submodule','update','--init','--recursive','--depth','1','third_party/openvpn','third_party/softether','third_party/vcpkg')
    $env:VCPKG_ROOT = Join-Path $root 'third_party/vcpkg'
    Invoke-Checked (Join-Path $env:VCPKG_ROOT 'bootstrap-vcpkg.bat') @('-disableMetrics')
    $source = Join-Path $root "third_party/$Engine"
    $build = Join-Path $root "build/bin/native-$Engine-$Arch"
    $stage = Join-Path $root ('build/bin/runtime-' + $Engine + '-' + $Arch + '-' + [guid]::NewGuid().ToString('N'))
    New-Item -ItemType Directory -Path $stage | Out-Null
    $nativeArch = if ($Arch -eq 'amd64') { 'x64' } else { 'arm64' }
    if ($Engine -eq 'openvpn') {
        Push-Location $source
        try {
            Invoke-Checked $cmake @('--preset',"win-$Arch-release",'-B',$build,'-DBUILD_TESTING=OFF')
            Invoke-Checked $cmake @('--build',$build,'--config','Release','--target','openvpn','tapctl','--parallel','2')
        } finally { Pop-Location }
        Copy-Item -LiteralPath (Join-Path $build 'Release/openvpn.exe') -Destination $stage
        Copy-Item -LiteralPath (Join-Path $build 'src/tapctl/Release/tapctl.exe') -Destination $stage
        Copy-Item -Path (Join-Path $build "vcpkg_installed/$nativeArch-windows-ovpn/bin/*.dll") -Destination $stage
        $notices = Join-Path $stage 'licenses'
        New-Item -ItemType Directory -Path $notices | Out-Null
        Get-ChildItem -Path (Join-Path $build "vcpkg_installed/$nativeArch-windows-ovpn/share/*/copyright") -File | ForEach-Object {
            Copy-Item -LiteralPath $_.FullName -Destination (Join-Path $notices ($_.Directory.Name + '-copyright.txt'))
        }
        $crt = Get-ChildItem -Path (Join-Path $vs "VC/Redist/MSVC/*/$nativeArch/Microsoft.VC*.CRT") -Directory | Sort-Object FullName -Descending | Select-Object -First 1
        if (-not $crt) { throw "VC runtime redistributable files missing for $nativeArch" }
        Copy-Item -Path (Join-Path $crt.FullName '*.dll') -Destination $stage
    } else {
        # Use SoftEther's upstream ClangCL/static-runtime configuration.
        Invoke-Checked $cmake @('-S',$source,'-B',$build,'-G','Visual Studio 17 2022','-A',$nativeArch,'-T','ClangCL',
            "-DCMAKE_TOOLCHAIN_FILE=$env:VCPKG_ROOT/scripts/buildsystems/vcpkg.cmake",
            "-DVCPKG_TARGET_TRIPLET=$nativeArch-windows-static",'-DBUILD_NUMBER=5190')
        Invoke-Checked $cmake @('--build',$build,'--config','Release','--target','vpnclient','vpncmd','vpndrvinst','hamcore-archive-build','--parallel','2')
        foreach ($name in @('vpnclient.exe','vpncmd.exe','vpndrvinst.exe','hamcore.se2')) {
            $file = Get-ChildItem -LiteralPath $build -Filter $name -Recurse | Select-Object -First 1
            if (-not $file) { throw "SoftEther build did not produce $name" }
            Copy-Item -LiteralPath $file.FullName -Destination $stage
        }
        $notices = Join-Path $stage 'licenses'
        New-Item -ItemType Directory -Path $notices | Out-Null
        Copy-Item -LiteralPath (Join-Path $source 'LICENSE') -Destination $notices
        Copy-Item -LiteralPath (Join-Path $source 'src/bin/hamcore/SOURCES_OF_BINARY_FILES.TXT') -Destination $notices
    }
    $commit = (& git -C $source rev-parse HEAD).Trim()
    @{ engine=$Engine; arch=$Arch; commit=$commit } | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $stage 'source-build.json') -Encoding UTF8
    if ($Engine -eq 'openvpn') {
        Invoke-Checked python @('scripts/prepare-vpn-runtime.py','--arch',$Arch,'--runtime-dir',$stage)
    } else {
        Invoke-Checked python @('scripts/prepare-vpn-runtime.py','--engine','softether','--arch',$Arch,'--runtime-dir',$stage)
    }
} finally { Pop-Location }
