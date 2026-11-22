"""Headless packaging tests; fixture PE files are data and are never executed."""
import importlib.util
import json
from pathlib import Path
import struct
import tempfile
import unittest

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


if __name__ == "__main__":
    unittest.main()
