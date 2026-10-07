"""Trusted parent: isolate execution, then promote bounded regular files."""
import os
import stat
import subprocess
import tempfile
from pathlib import Path

root = Path.cwd()
scratch = Path(tempfile.mkdtemp(prefix='vanta-check-'))
source = Path(tempfile.mkdtemp(prefix='vanta-source-'))
artifacts = root / 'ci-artifacts'
artifacts.mkdir(exist_ok=False)
flags = os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW | os.O_CLOEXEC
name = 'vanta-isolated-check'
roles = ['owner', 'sales', 'support', 'fulfilment', 'catalogue', 'analyst']
screens = ['home-390', 'home-820', 'home-1440', 'bag-mobile', 'bag-desktop',
           'staff-portal-mobile', 'staff-portal-desktop', 'care-order-lookup',
           'care-support-help-mobile', 'chat-mobile', 'sales-desk-desktop', 'sales-desk-mobile']
screens += [f'portal-{role}-{size}' for role in roles for size in ['desktop', 'mobile']]
screens += [f'page-{page}-{width}' for page in ['about', 'contact', 'help-center', 'checkout'] for width in [390, 1440]]
allow = [('advisories.json', 'advisories.json', 4 * 1024**2), ('check.log', 'check.log', 8 * 1024**2), ('project/work/site-pages.json', 'site-pages.json', 1024**2)]
allow += [(f'project/work/{s}.png', f'{s}.png', 4 * 1024**2) for s in screens]
allow += [('project/outputs/vanta-noir-namecheap-update.zip', 'vanta-noir-namecheap-update.zip', 128 * 1024**2)]

def promote(sfd, dfd, relative, destination, limit):
    parts = relative.split('/')
    assert all(p not in ('', '.', '..') for p in parts)
    current = os.dup(sfd)
    try:
        for part in parts[:-1]:
            nxt = os.open(part, flags, dir_fd=current)
            os.close(current)
            current = nxt
        fd = os.open(parts[-1], os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK | os.O_CLOEXEC, dir_fd=current)
        try:
            before = os.fstat(fd)
            assert stat.S_ISREG(before.st_mode) and before.st_nlink == 1 and before.st_size <= limit
            data = bytearray()
            while len(data) < before.st_size:
                chunk = os.read(fd, min(1024**2, before.st_size - len(data)))
                assert chunk, 'Short artifact read'
                data.extend(chunk)
            after = os.fstat(fd)
            assert (before.st_dev, before.st_ino, before.st_mode, before.st_nlink, before.st_size, before.st_mtime_ns) == (after.st_dev, after.st_ino, after.st_mode, after.st_nlink, after.st_size, after.st_mtime_ns)
            out = os.open(destination, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, 0o644, dir_fd=dfd)
            with os.fdopen(out, 'wb') as f:
                info = os.fstat(f.fileno())
                assert stat.S_ISREG(info.st_mode) and info.st_nlink == 1
                f.write(data)
            return len(data)
        finally:
            os.close(fd)
    finally:
        os.close(current)

result = 1
try:
    archive = subprocess.Popen(['git', 'archive', 'HEAD'], stdout=subprocess.PIPE)
    subprocess.run(['tar', '-x', '-C', str(source)], stdin=archive.stdout, check=True)
    archive.stdout.close()
    assert archive.wait() == 0
    os.chmod(source, 0o755)
    subprocess.run(['mount', '-t', 'tmpfs', '-o', 'size=5G,nosuid,nodev', 'tmpfs', str(scratch)], check=True)
    os.chown(scratch, 10001, 10001)
    sfd, dfd = os.open(scratch, flags), os.open(artifacts, flags)
    try:
        command = ['docker', 'run', '--name', name, '--network=none', '--read-only',
                   '--user=10001:10001', '--cap-drop=ALL', '--security-opt=no-new-privileges',
                   '--ipc=none', '--cpus=2', '--memory=6g', '--memory-swap=6g', '--pids-limit=512',
                   '--ulimit=nofile=4096:4096', '--ulimit=fsize=268435456:268435456',
                   '-v', f'{source}:/source:ro', '-v', f'{scratch}:/scratch:rw',
                   'vanta-check', 'env', '-i', 'PATH=/usr/local/bin:/usr/bin:/bin',
                   'HOME=/scratch/home', 'TMPDIR=/scratch/tmp', 'CI=true', 'NO_COLOR=1',
                   'NODE_PATH=/browser/node_modules', 'CHROMIUM_EXECUTABLE=/usr/bin/chromium',
                   'WRANGLER_SEND_METRICS=false', 'NEXT_TELEMETRY_DISABLED=1',
                   'bash', '/source/scripts/ci/check.sh']
        try:
            result = subprocess.run(command, timeout=1500).returncode
        except subprocess.TimeoutExpired:
            print('Check exceeded 25-minute execution limit', flush=True)
        finally:
            subprocess.run(['docker', 'rm', '-f', name], check=True)
        total = 0
        for relative, destination, limit in allow:
            try:
                total += promote(sfd, dfd, relative, destination, min(limit, 232 * 1024**2 - total))
            except FileNotFoundError:
                pass
        print((artifacts / 'check.log').read_text(errors='replace')[-30000:], flush=True)
    finally:
        os.close(sfd)
        os.close(dfd)
finally:
    subprocess.run(['umount', str(scratch)], check=False)
raise SystemExit(result)
