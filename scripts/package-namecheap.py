"""Package public storefront files with portable cPanel permissions."""
import argparse
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import stat
from zipfile import ZipFile, ZipInfo, ZIP_DEFLATED


def package(root, output, base=None, repair_code=False):
    root, output = Path(root).resolve(), Path(output).resolve()
    if not (root / 'index.html').is_file():
        raise ValueError('Expected the rendered public storefront directory')
    if base and repair_code:
        raise ValueError("Choose either a delta archive or a complete code repair")
    previous = ZipFile(base) if base else None
    timestamp = datetime.now(timezone.utc).timetuple()[:6]
    try:
        old_names = set(previous.namelist()) if previous else set()
        files = []
        for path in sorted(root.rglob('*')):
            if path.is_symlink():
                raise ValueError('Do not include symlinks in public_html archives')
            if not path.is_file() or path == output:
                continue
            name = path.relative_to(root).as_posix()
            if name == 'storefront-release.json':
                continue
            if repair_code and not (name.endswith(('.html', '.php')) or name.startswith('assets/') or name in {'.htaccess', 'store-config.js', 'robots.txt', 'sitemap.xml', 'images/vanta-spire-light.svg', 'images/vanta-spire-on-dark.svg', 'images/vanta-emblem.svg', 'images/vanta-technical-campaign-2026.webp', 'images/vanta-technical-campaign-mobile-2026.webp'}):
                continue
            data = path.read_bytes()
            if previous and name in old_names and previous.read(name) == data:
                continue
            files.append((name, data))
        # Public checksums identify a mixed upload without exposing source or credentials.
        controls = {name: hashlib.sha256(data).hexdigest() for name, data in files
                    if name.endswith(('.html', '.php')) or name.startswith('assets/') or name in {'.htaccess', 'store-config.js'}}
        manifest = {'schema': 1, 'packagedAt': datetime.now(timezone.utc).isoformat(),
                    'kind': 'code-repair' if repair_code else ('delta' if base else 'full'),
                    'files': controls}
        files.append(('storefront-release.json', (json.dumps(manifest, indent=2) + '\n').encode()))
        directories = sorted({parent.as_posix() + '/' for name, _ in files
                              for parent in Path(name).parents if str(parent) != '.'})
        output.parent.mkdir(parents=True, exist_ok=True)
        with ZipFile(output, 'w', ZIP_DEFLATED, compresslevel=6) as archive:
            for name, data in [(d, b'') for d in directories] + files:
                entry = ZipInfo(name, date_time=timestamp)
                entry.create_system = 3
                is_dir = name.endswith('/')
                entry.external_attr = ((stat.S_IFDIR | 0o755) if is_dir else (stat.S_IFREG | 0o644)) << 16
                if is_dir:
                    entry.external_attr |= 0x10
                entry.compress_type = ZIP_DEFLATED
                archive.writestr(entry, data)
        with ZipFile(output) as archive:
            for entry in archive.infolist():
                expected = 0o755 if entry.is_dir() else 0o644
                assert stat.S_IMODE(entry.external_attr >> 16) == expected, entry.filename
            assert archive.testzip() is None
        return len(files)
    finally:
        if previous:
            previous.close()


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('root')
    parser.add_argument('output')
    parser.add_argument('--base')
    parser.add_argument('--repair-code', action='store_true', help='Include every HTML page and application asset; retain already-uploaded images')
    args = parser.parse_args()
    count = package(args.root, args.output, args.base, args.repair_code)
    print(f'Packaged and verified {count} files: files 644, directories 755.')
