"""Headless packaging tests; fixture PE files are data and are never executed."""
import hashlib
import importlib.util
import json
from pathlib import Path
import struct
import tempfile
import unittest
import zipfile

spec = importlib.util.spec_from_file_location("vpn_packaging", Path(__file__).with_name("prepare-vpn-runtime.py"))
packaging = importlib.util.module_from_spec(spec)
spec.loader.exec_module(packaging)


class PackagingTests(unittest.TestCase):
    def fixture(self, root):
        (root / "source-build.json").write_text(json.dumps({"engine": "openvpn", "arch": "amd64", "commit": "fixture"}))
        pe = bytearray(128)
        pe[:2] = b"MZ"
        struct.pack_into("<I", pe, 60, 64)
        pe[64:68] = b"PE\x00\x00"
        struct.pack_into("<H", pe, 68, 0x8664)
        for name in ("openvpn.exe", "tapctl.exe", "vcruntime140.dll"):
            (root / name).write_bytes(pe)

    def test_requires_matching_source_provenance(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.fixture(root)
            with self.assertRaisesRegex(RuntimeError, "provenance"):
                packaging.collect_runtime(root, "amd64", "different-revision")

    def test_rejects_wrong_machine_type(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.fixture(root)
            data = bytearray((root / "tapctl.exe").read_bytes())
            struct.pack_into("<H", data, 68, 0xAA64)
            (root / "tapctl.exe").write_bytes(data)
            with self.assertRaisesRegex(RuntimeError, "architecture"):
                packaging.collect_runtime(root, "amd64", "fixture")

    def test_accepts_arm64_hybrid_runtime(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.fixture(root)
            root.joinpath("source-build.json").write_text(
                json.dumps({"engine": "openvpn", "arch": "arm64", "commit": "fixture"})
            )
            for name in ("openvpn.exe", "tapctl.exe", "vcruntime140.dll"):
                data = bytearray((root / name).read_bytes())
                struct.pack_into("<H", data, 68, packaging.MACHINE_ARM64X)
                (root / name).write_bytes(data)

            result = packaging.collect_runtime(root, "arm64", "fixture")
            self.assertIn("vcruntime140.dll", result)

    def test_accepts_amd64_vcruntime140_1_for_arm64(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.fixture(root)
            root.joinpath("source-build.json").write_text(
                json.dumps({"engine": "openvpn", "arch": "arm64", "commit": "fixture"})
            )
            for name in ("openvpn.exe", "tapctl.exe", "vcruntime140.dll"):
                data = bytearray((root / name).read_bytes())
                struct.pack_into("<H", data, 68, packaging.MACHINE_ARM64)
                (root / name).write_bytes(data)
            extra = root / "vcruntime140_1.dll"
            data = bytearray((root / "vcruntime140.dll").read_bytes())
            struct.pack_into("<H", data, 68, packaging.MACHINE_AMD64)
            extra.write_bytes(data)

            result = packaging.collect_runtime(root, "arm64", "fixture")
            self.assertIn("vcruntime140_1.dll", result)

    def test_collects_binaries_and_notices_without_installer(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.fixture(root)
            (root / "licenses").mkdir()
            (root / "licenses/copyright.txt").write_text("fixture license")
            (root / "setup.exe").write_bytes(b"must not be packaged")
            result = packaging.collect_runtime(root, "amd64", "fixture")
            self.assertIn("licenses/copyright.txt", result)
            self.assertIn("openvpn.exe", result)
            self.assertNotIn("setup.exe", result)

    def softether_fixture(self, root):
        (root / "source-build.json").write_text(
            json.dumps({"engine": "softether", "arch": "amd64", "commit": "fixture"})
        )
        pe = bytearray(128)
        pe[:2] = b"MZ"
        struct.pack_into("<I", pe, 60, 64)
        pe[64:68] = b"PE\x00\x00"
        struct.pack_into("<H", pe, 68, packaging.MACHINE_AMD64)
        (root / "vpnclient.exe").write_bytes(pe)
        (root / "vpncmd.exe").write_bytes(pe)
        (root / "vpndrvinst.exe").write_bytes(pe)
        (root / "hamcore.se2").write_bytes(b"fixture hamcore")
        (root / "licenses").mkdir()
        (root / "licenses/LICENSE").write_text("fixture license")

    def test_collects_softether_runtime_separately(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.softether_fixture(root)
            result = packaging.collect_softether_runtime(root, "amd64", "fixture")
            self.assertIn("vpnclient.exe", result)
            self.assertIn("vpncmd.exe", result)
            self.assertIn("vpndrvinst.exe", result)
            self.assertIn("hamcore.se2", result)
            self.assertIn("licenses/LICENSE", result)

    def test_rejects_softether_wrong_provenance_or_architecture(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.softether_fixture(root)
            with self.assertRaisesRegex(RuntimeError, "provenance"):
                packaging.collect_softether_runtime(root, "amd64", "different")
            with self.assertRaisesRegex(RuntimeError, "only for AMD64"):
                packaging.collect_softether_runtime(root, "arm64", "fixture")

    def test_rejects_softether_missing_file_or_wrong_pe(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.softether_fixture(root)
            (root / "vpncmd.exe").unlink()
            with self.assertRaisesRegex(RuntimeError, "missing vpncmd.exe"):
                packaging.collect_softether_runtime(root, "amd64", "fixture")
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.softether_fixture(root)
            data = bytearray((root / "vpnclient.exe").read_bytes())
            struct.pack_into("<H", data, 68, packaging.MACHINE_ARM64)
            (root / "vpnclient.exe").write_bytes(data)
            with self.assertRaisesRegex(RuntimeError, "architecture"):
                packaging.collect_softether_runtime(root, "amd64", "fixture")

    def test_validate_cached_bundle_rejects_stale_or_installed_local(self):
        with tempfile.TemporaryDirectory() as tmp:
            bundle = Path(tmp) / "bundle.zip"
            payload = b"binary"
            manifest = {
                "engine": "openvpn",
                "arch": "amd64",
                "provenance": "source-built",
                "commit": "commit-a",
                "vcpkg_commit": "vcpkg-a",
                "lock_sha256": "lock-a",
                "files": {"openvpn.exe": hashlib.sha256(payload).hexdigest()},
            }
            with zipfile.ZipFile(bundle, "w") as z:
                z.writestr("openvpn.exe", payload)
                z.writestr("manifest.json", json.dumps(manifest))

            ok, _ = packaging.validate_cached_bundle(bundle, "openvpn", "amd64", "commit-a", "vcpkg-a", "lock-a")
            self.assertTrue(ok)

            ok, reason = packaging.validate_cached_bundle(bundle, "openvpn", "amd64", "commit-b", "vcpkg-a", "lock-a")
            self.assertFalse(ok)
            self.assertIn("commit", reason)

            manifest["provenance"] = "installed-local"
            with zipfile.ZipFile(bundle, "w") as z:
                z.writestr("openvpn.exe", payload)
                z.writestr("manifest.json", json.dumps(manifest))
            ok, reason = packaging.validate_cached_bundle(bundle, "openvpn", "amd64", "commit-a", "vcpkg-a", "lock-a")
            self.assertFalse(ok)
            self.assertIn("source-built", reason)


if __name__ == "__main__":
    unittest.main()
