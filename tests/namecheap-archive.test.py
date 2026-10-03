import importlib.util
from pathlib import Path
import stat
import tempfile
import unittest
import hashlib
import json
from datetime import datetime, timezone
from zipfile import ZipFile
spec = importlib.util.spec_from_file_location('packager', 'scripts/package-namecheap.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

class ArchivePermissions(unittest.TestCase):
    def test_code_repair_includes_all_pages_and_assets_with_fresh_dates(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)/'site'; root.mkdir()
            for name, data in {'index.html': b'home', 'products/stealth.html': b'product',
                               'assets/app.js': b'new bundle', '.htaccess': b'rules',
                               'store-config.js': b'config', 'images/photo.webp': b'photo'}.items():
                path = root/name; path.parent.mkdir(parents=True, exist_ok=True); path.write_bytes(data)
            output = Path(tmp)/'repair.zip'
            module.package(root, output, repair_code=True)
            with ZipFile(output) as z:
                self.assertNotIn('images/photo.webp', z.namelist())
                self.assertEqual(z.read('products/stealth.html'), b'product')
                self.assertEqual(z.read('assets/app.js'), b'new bundle')
                self.assertEqual(z.getinfo('index.html').date_time[:3], datetime.now(timezone.utc).timetuple()[:3])
                manifest = json.loads(z.read('storefront-release.json'))
                self.assertEqual(manifest['kind'], 'code-repair')
                self.assertEqual(manifest['files']['assets/app.js'], hashlib.sha256(b'new bundle').hexdigest())
                self.assertIn('.htaccess', manifest['files'])

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
