"""Package public storefront files with portable cPanel permissions."""
import argparse
from pathlib import Path
import stat
from zipfile import ZipFile, ZipInfo, ZIP_DEFLATED


def package(root, output, base=None):
    root, output = Path(root).resolve(), Path(output).resolve()
    if not (root / 'index.html').is_file():
        raise ValueError('Expected the rendered public storefront directory')
    previous = ZipFile(base) if base else None
    try:
        old_names = set(previous.namelist()) if previous else set()
        files = []
        for path in sorted(root.rglob('*')):
            if path.is_symlink():
                raise ValueError('Do not include symlinks in public_html archives')
            if not path.is_file() or path == output:
                continue
            name = path.relative_to(root).as_posix()
            data = path.read_bytes()
            if previous and name in old_names and previous.read(name) == data:
                continue
            files.append((name, data))
        directories = sorted({parent.as_posix() + '/' for name, _ in files
                              for parent in Path(name).parents if str(parent) != '.'})
        output.parent.mkdir(parents=True, exist_ok=True)
        with ZipFile(output, 'w', ZIP_DEFLATED, compresslevel=6) as archive:
            for name, data in [(d, b'') for d in directories] + files:
                entry = ZipInfo(name)
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
    args = parser.parse_args()
    count = package(args.root, args.output, args.base)
    print(f'Packaged and verified {count} files: files 644, directories 755.')
