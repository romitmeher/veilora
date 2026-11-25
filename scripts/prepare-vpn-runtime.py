"""Package locally compiled upstream OpenVPN code; never run an MSI installer.

The daemon and adapter tool must come from build-vpn-source.ps1. Only the signed
kernel driver is obtained prebuilt, because rebuilding it invalidates its signature.
"""
import argparse
import hashlib
import json
from pathlib import Path
import struct
import subprocess
import urllib.request
import zipfile

ROOT = Path(__file__).resolve().parents[1]
VERSION = "2.7.9"

MACHINE_AMD64 = 0x8664
MACHINE_ARM64 = 0xAA64
MACHINE_ARM64EC = 0xA641
MACHINE_ARM64X = 0xA64E

VC_RUNTIME_NAMES = {
    "concrt140.dll",
    "msvcp140.dll",
    "msvcp140_1.dll",
    "msvcp140_2.dll",
    "vcamp140.dll",
    "vcomp140.dll",
    "vcruntime140.dll",
    "vcruntime140_1.dll",
}


def matches_architecture(machine, arch, name):
    if arch == "amd64":
        return machine == MACHINE_AMD64
    if machine in (MACHINE_ARM64, MACHINE_ARM64EC, MACHINE_ARM64X):
        return True
    return name.lower() in VC_RUNTIME_NAMES and machine == MACHINE_AMD64


def download(url, limit):
    request = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 Veilora-Build/1.0"})
    with urllib.request.urlopen(request, timeout=180) as response:
        data = response.read(limit + 1)
    if len(data) > limit:
        raise RuntimeError("Download exceeds size limit")
    return data


def validate_pe_files(contents, arch, allowed_names=None):
    for name, data in contents.items():
        if allowed_names is not None and name not in allowed_names:
            continue
        if len(data) < 64 or data[:2] != b"MZ":
            raise RuntimeError(f"Invalid PE file: {name}")
        pe = struct.unpack_from("<I", data, 60)[0]
        if pe + 6 > len(data) or data[pe:pe + 4] != b"PE\x00\x00":
            raise RuntimeError(f"Invalid PE header: {name}")
        machine = struct.unpack_from("<H", data, pe + 4)[0]
        if not matches_architecture(machine, arch, name):
            raise RuntimeError(f"Wrong architecture: {name}")


def collect_runtime(runtime_dir, arch, commit):
    provenance = json.loads((runtime_dir / "source-build.json").read_text(encoding="utf-8-sig"))
    if provenance != {"engine": "openvpn", "arch": arch, "commit": commit}:
        raise RuntimeError("Runtime provenance does not match the pinned upstream source/architecture")
    contents = {}
    for source in runtime_dir.iterdir():
        if source.suffix.lower() not in (".exe", ".dll", ".json"):
            continue
        if source.suffix.lower() == ".exe" and source.name not in ("openvpn.exe", "tapctl.exe"):
            continue
        data = source.read_bytes()
        if source.suffix.lower() in (".exe", ".dll"):
            if len(data) < 64 or data[:2] != b"MZ":
                raise RuntimeError(f"Invalid PE file: {source.name}")
            pe = struct.unpack_from("<I", data, 60)[0]
            if pe + 6 > len(data) or data[pe:pe + 4] != b"PE\x00\x00":
                raise RuntimeError(f"Invalid PE header: {source.name}")
            machine = struct.unpack_from("<H", data, pe + 4)[0]
            if not matches_architecture(machine, arch, source.name):
                raise RuntimeError(f"Wrong architecture: {source.name}")
        contents[source.name] = data
    for required in ("openvpn.exe", "tapctl.exe", "vcruntime140.dll"):
        if required not in contents:
            raise RuntimeError(f"Source build is missing {required}")
    for notice in (runtime_dir / "licenses").glob("*"):
        if notice.is_file():
            contents["licenses/" + notice.name] = notice.read_bytes()
    return contents


def collect_softether_runtime(runtime_dir, arch, commit):
    if arch != "amd64":
        raise RuntimeError("SoftEther bundles are currently supported only for AMD64")
    provenance = json.loads((runtime_dir / "source-build.json").read_text(encoding="utf-8-sig"))
    if provenance != {"engine": "softether", "arch": arch, "commit": commit}:
        raise RuntimeError("SoftEther runtime provenance does not match the pinned upstream source/architecture")

    required = ("vpnclient.exe", "vpncmd.exe", "vpndrvinst.exe", "hamcore.se2")
    contents = {}
    for name in required:
        source = runtime_dir / name
        if not source.is_file():
            raise RuntimeError(f"SoftEther source build is missing {name}")
        contents[name] = source.read_bytes()

    pe_names = ("vpnclient.exe", "vpncmd.exe", "vpndrvinst.exe")
    validate_pe_files({name: contents[name] for name in pe_names}, arch)
    for notice in (runtime_dir / "licenses").glob("*"):
        if notice.is_file():
            contents["licenses/" + notice.name] = notice.read_bytes()
    return contents


def validate_cached_bundle(target_zip, engine, arch, commit, vcpkg_commit, lock_sha256, allow_installed=False):
    if not Path(target_zip).is_file():
        return False, "bundle does not exist"
    try:
        with zipfile.ZipFile(target_zip, "r") as archive:
            manifest = json.loads(archive.read("manifest.json").decode("utf-8"))
            if manifest.get("engine", "openvpn") != engine:
                return False, f"engine mismatch: {manifest.get('engine')}"
            if manifest.get("arch") != arch:
                return False, f"arch mismatch: {manifest.get('arch')}"
            provenance = manifest.get("provenance", "")
            if not allow_installed:
                if provenance != "source-built":
                    return False, f"provenance {provenance!r} is not source-built"
                if manifest.get("commit") != commit:
                    return False, "source commit changed"
                if manifest.get("vcpkg_commit") != vcpkg_commit:
                    return False, "vcpkg commit changed"
                if manifest.get("lock_sha256") != lock_sha256:
                    return False, "vpn-runtime.lock.json changed"
            files = manifest.get("files") or {}
            if not files:
                return False, "manifest has no files"
            for name, expected_hash in files.items():
                data = archive.read(name)
                if hashlib.sha256(data).hexdigest() != expected_hash:
                    return False, f"hash mismatch for {name}"
    except Exception as exc:
        return False, str(exc)
    return True, "ok"


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--engine", choices=["openvpn", "softether"], default="openvpn")
    parser.add_argument("--allow-installed-openvpn", action="store_true",
                        help="Package an existing verified OpenVPN installation on policy-blocked dev machines")
    parser.add_argument("--check-cached", action="store_true",
                        help="Validate cached runtime bundle against current commits, lockfile, and manifest")
    parser.add_argument("--arch", choices=["amd64", "arm64"], default="amd64")
    parser.add_argument("--runtime-dir", type=Path, required=False,
                        help="Source-built binaries staged by build-vpn-source.ps1")
    args = parser.parse_args()
    lock_path = ROOT / "scripts/vpn-runtime.lock.json"
    lock_bytes = lock_path.read_bytes()
    lock_sha256 = hashlib.sha256(lock_bytes).hexdigest()
    lock = json.loads(lock_bytes.decode("utf-8"))
    engine_dir = "openvpn" if args.engine == "openvpn" else "softether"
    source = ROOT / "third_party" / engine_dir
    commit = subprocess.check_output(["git", "-C", str(source), "rev-parse", "HEAD"], text=True).strip()
    vcpkg_source = ROOT / "third_party/vcpkg"
    vcpkg_commit = subprocess.check_output(["git", "-C", str(vcpkg_source), "rev-parse", "HEAD"], text=True).strip()

    if args.check_cached:
        target = ROOT / "internal/vpn/payload" / (
            f"windows-{args.arch}.zip" if args.engine == "openvpn" else f"windows-{args.arch}-softether.zip"
        )
        ok, reason = validate_cached_bundle(
            target, args.engine, args.arch, commit, vcpkg_commit, lock_sha256,
            allow_installed=args.allow_installed_openvpn,
        )
        if not ok:
            print(f"Cached {args.engine} ({args.arch}) bundle invalid: {reason}")
            raise SystemExit(1)
        print(f"Cached {args.engine} ({args.arch}) bundle is valid.")
        return

    if args.runtime_dir is None:
        parser.error("--runtime-dir is required unless --check-cached is specified")

    if args.allow_installed_openvpn:
        if args.engine != "openvpn":
            raise RuntimeError("Installed OpenVPN fallback supports only OpenVPN")
        contents = {}
        for name in ("openvpn.exe", "tapctl.exe"):
            source_file = args.runtime_dir / name
            if not source_file.is_file():
                raise RuntimeError(f"Installed OpenVPN runtime is missing {name}")
            contents[name] = source_file.read_bytes()
        for source_file in args.runtime_dir.glob("*.dll"):
            contents[source_file.name] = source_file.read_bytes()
        validate_pe_files({n: v for n, v in contents.items() if n.endswith((".exe", ".dll"))}, args.arch)

    if args.engine == "softether":
        contents = collect_softether_runtime(args.runtime_dir, args.arch, commit)
        contents["licenses/softether-LICENSE"] = (source / "LICENSE").read_bytes()
        contents["licenses/softether-SOURCES_OF_BINARY_FILES.TXT"] = (
            source / "src" / "bin" / "hamcore" / "SOURCES_OF_BINARY_FILES.TXT"
        ).read_bytes()
        contents["manifest.json"] = json.dumps({
            "engine": "softether",
            "arch": args.arch,
            "provenance": "source-built",
            "version": "5.2.5190",
            "source": "https://github.com/SoftEtherVPN/SoftEtherVPN",
            "commit": commit,
            "vcpkg_commit": vcpkg_commit,
            "lock_sha256": lock_sha256,
            "files": {n: hashlib.sha256(v).hexdigest() for n, v in contents.items()},
        }, indent=2).encode()
        target = ROOT / "internal/vpn/payload" / f"windows-{args.arch}-softether.zip"
        target.parent.mkdir(parents=True, exist_ok=True)
        with zipfile.ZipFile(target, "w", zipfile.ZIP_DEFLATED) as archive:
            for name in sorted(contents):
                info = zipfile.ZipInfo(name, (2026, 1, 1, 0, 0, 0))
                info.compress_type = zipfile.ZIP_DEFLATED
                archive.writestr(info, contents[name])
        softether_sources = ROOT / "build/bin/Veilora-softether-sources.zip"
        softether_sources.parent.mkdir(parents=True, exist_ok=True)
        subprocess.check_call(["git", "-C", str(source), "archive", "--format=zip", "-o", str(softether_sources), commit])
        vcpkg_source = ROOT / "third_party/vcpkg"
        vcpkg_commit = subprocess.check_output(["git", "-C", str(vcpkg_source), "rev-parse", "HEAD"], text=True).strip()
        vcpkg_sources = ROOT / "build/bin/Veilora-softether-vcpkg-sources.zip"
        subprocess.check_call(["git", "-C", str(vcpkg_source), "archive", "--format=zip", "-o", str(vcpkg_sources), vcpkg_commit])
        print(f"Prepared source-built runtime: {target}")
        return

    if args.allow_installed_openvpn:
        lock = json.loads((ROOT / "scripts/vpn-runtime.lock.json").read_text(encoding="utf-8"))
        tap = download(lock["tap"]["url"], 10 * 1024 * 1024)
        if hashlib.sha256(tap).hexdigest() != lock["tap"]["sha256"]:
            raise RuntimeError("TAP archive checksum mismatch")
        import io
        with zipfile.ZipFile(io.BytesIO(tap)) as archive:
            for name in ("OemVista.inf", "tap0901.sys", "tap0901.cat"):
                contents[name] = archive.read(f"dist.win10/{args.arch}/{name}")
        contents["manifest.json"] = json.dumps({
            "engine": "openvpn",
            "arch": args.arch,
            "provenance": "installed-local",
            "source": "https://github.com/OpenVPN/openvpn",
            "files": {n: hashlib.sha256(v).hexdigest() for n, v in contents.items()},
        }, indent=2).encode()
        target = ROOT / "internal/vpn/payload" / f"windows-{args.arch}.zip"
        target.parent.mkdir(parents=True, exist_ok=True)
        with zipfile.ZipFile(target, "w", zipfile.ZIP_DEFLATED) as archive:
            for name in sorted(contents):
                info = zipfile.ZipInfo(name, (2026, 1, 1, 0, 0, 0))
                info.compress_type = zipfile.ZIP_DEFLATED
                archive.writestr(info, contents[name])
        print(f"Prepared installed OpenVPN runtime fallback: {target}")
        return

    contents = collect_runtime(args.runtime_dir, args.arch, commit)
    tap = download(lock["tap"]["url"], 10 * 1024 * 1024)
    if hashlib.sha256(tap).hexdigest() != lock["tap"]["sha256"]:
        raise RuntimeError("TAP archive checksum mismatch")
    import io
    with zipfile.ZipFile(io.BytesIO(tap)) as archive:
        for name in ("OemVista.inf", "tap0901.sys", "tap0901.cat"):
            contents[name] = archive.read(f"dist.win10/{args.arch}/{name}")
    for name in ("COPYING", "COPYRIGHT.GPL", "COPYRIGHT.MIT", "AUTHORS", "README"):
        if (source / name).is_file():
            contents["licenses/openvpn-" + name] = (source / name).read_bytes()
    if not any(n.startswith("licenses/openvpn-COPYING") for n in contents):
        raise RuntimeError("Upstream OpenVPN license is missing")
    contents["licenses/VEILORA-THIRD-PARTY.md"] = (ROOT / "docs/BUNDLED-VPN.md").read_bytes()
    contents["manifest.json"] = json.dumps({
        "engine": "openvpn",
        "arch": args.arch,
        "provenance": "source-built",
        "version": VERSION,
        "source": "https://github.com/OpenVPN/openvpn",
        "commit": commit,
        "vcpkg_commit": vcpkg_commit,
        "lock_sha256": lock_sha256,
        "files": {n: hashlib.sha256(v).hexdigest() for n, v in contents.items()},
    }, indent=2).encode()
    target = ROOT / "internal/vpn/payload" / f"windows-{args.arch}.zip"
    target.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(target, "w", zipfile.ZIP_DEFLATED) as archive:
        for name in sorted(contents):
            info = zipfile.ZipInfo(name, (2026, 1, 1, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            archive.writestr(info, contents[name])
    print(f"Prepared source-built runtime: {target}")

    # Keep the corresponding sources next to release artifacts, not inside the
    # executable. Both release workflows publish this archive with the binaries.
    source_dir = ROOT / "build/bin/vpn-sources"
    source_dir.mkdir(parents=True, exist_ok=True)
    for source in lock["sources"]:
        destination = source_dir / source["name"]
        algorithm = source.get("algorithm", "sha256")
        if not destination.exists() or hashlib.new(algorithm, destination.read_bytes()).hexdigest() != source["hash"]:
            print("Fetching source: " + source["name"], flush=True)
            data = download(source["url"], 100 * 1024 * 1024)
            if hashlib.new(algorithm, data).hexdigest() != source["hash"]:
                raise RuntimeError(f"Source checksum mismatch: {source['name']}")
            destination.write_bytes(data)
    with zipfile.ZipFile(ROOT / "build/bin/Veilora-vpn-sources.zip", "w", zipfile.ZIP_STORED) as archive:
        for source in lock["sources"]:
            archive.write(source_dir / source["name"], source["name"])
        archive.write(ROOT / "scripts/vpn-runtime.lock.json", "vpn-runtime.lock.json")
        archive.write(ROOT / "scripts/prepare-vpn-runtime.py", "prepare-vpn-runtime.py")
        archive.write(ROOT / "scripts/build-vpn-source.ps1", "build-vpn-source.ps1")
        archive.write(ROOT / "docs/BUNDLED-VPN.md", "README.md")


if __name__ == "__main__":
    main()
