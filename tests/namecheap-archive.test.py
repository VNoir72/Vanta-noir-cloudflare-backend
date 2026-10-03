import importlib.util
from pathlib import Path
import stat
import tempfile
import unittest
from zipfile import ZipFile
spec = importlib.util.spec_from_file_location('packager', 'scripts/package-namecheap.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

class ArchivePermissions(unittest.TestCase):
    def test_full_and_delta_preserve_bytes_and_web_readability(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)/'site'; root.mkdir()
            (root/'assets').mkdir(); (root/'index.html').write_text('home')
            (root/'assets/app.js').write_text('script')
            (root/'assets/app.js').chmod(0o600)
            base = Path(tmp)/'base.zip'; patch = Path(tmp)/'patch.zip'
            module.package(root, base)
            (root/'index.html').write_text('updated')
            module.package(root, patch, base)
            for archive in [base, patch]:
                with ZipFile(archive) as z:
                    for entry in z.infolist():
                        self.assertEqual(stat.S_IMODE(entry.external_attr >> 16), 0o755 if entry.is_dir() else 0o644)
            with ZipFile(base) as a, ZipFile(patch) as b:
                self.assertEqual(a.read('assets/app.js'), b'script')
                self.assertEqual(b.read('index.html'), b'updated')
                self.assertNotIn('assets/app.js', b.namelist())

if __name__ == '__main__': unittest.main()
