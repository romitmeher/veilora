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
MACHINE_ARM64EC = 0xA64E
MACHINE_ARM64X = 0xA641


def matches_architecture(machine, arch):
    if arch == "amd64":
        return machine == MACHINE_AMD64
    return machine in (MACHINE_ARM64, MACHINE_ARM64EC, MACHINE_ARM64X)


def download(url, limit):
    request = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 Veilora-Build/1.0"})
    with urllib.request.urlopen(request, timeout=180) as response:
        data = response.read(limit + 1)
    if len(data) > limit:
        raise RuntimeError("Download exceeds size limit")
    return data


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
            if not matches_architecture(machine, arch):
                raise RuntimeError(f"Wrong architecture: {source.name}")
        contents[source.name] = data
    for required in ("openvpn.exe", "tapctl.exe", "vcruntime140.dll"):
        if required not in contents:
            raise RuntimeError(f"Source build is missing {required}")
    for notice in (runtime_dir / "licenses").glob("*"):
        if notice.is_file():
            contents["licenses/" + notice.name] = notice.read_bytes()
    return contents


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--arch", choices=["amd64", "arm64"], default="amd64")
    parser.add_argument("--runtime-dir", type=Path, required=True,
                        help="Source-built binaries staged by build-vpn-source.ps1")
    args = parser.parse_args()
    lock = json.loads((ROOT / "scripts/vpn-runtime.lock.json").read_text(encoding="utf-8"))
    source = ROOT / "third_party/openvpn"
    commit = subprocess.check_output(["git", "-C", str(source), "rev-parse", "HEAD"], text=True).strip()
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
    contents["manifest.json"] = json.dumps({"arch": args.arch, "version": VERSION,
        "source": "https://github.com/OpenVPN/openvpn", "commit": commit,
        "files": {n: hashlib.sha256(v).hexdigest() for n, v in contents.items()}}, indent=2).encode()
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
