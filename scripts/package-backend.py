"""Package regular backend build files for deployment, without local credentials."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
root = Path('dist')
target = Path('outputs/vanta-noir-backend.zip')
target.parent.mkdir(exist_ok=True)
total = 0
with ZipFile(target, 'w', ZIP_DEFLATED) as archive:
    for path in sorted(root.rglob('*')):
        if path.is_symlink():
            raise ValueError('Symlink in backend build')
        if not path.is_file():
            continue
        if path.suffix == '.map':
            continue
        total += path.stat().st_size
        if total > 128 * 1024**2:
            raise ValueError('Backend build exceeds artifact size limit')
        archive.write(path, path.as_posix())
