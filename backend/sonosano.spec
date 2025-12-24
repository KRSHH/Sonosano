# -*- mode: python ; coding: utf-8 -*-
import os
import sys
from PyInstaller.utils.hooks import collect_data_files, collect_all

venv_path = os.environ.get('VIRTUAL_ENV') or os.path.abspath(".venv")
python_version = f"python{sys.version_info.major}.{sys.version_info.minor}"
site_packages = os.path.join(venv_path, 'lib', python_version, 'site-packages')

datas = [('src/pynicotine', 'pynicotine')]
datas += collect_data_files('uroman')


hiddenimports = []
binaries = []

for pkg in ['fastapi', 'starlette', 'pydantic', 'pydantic_core', 'uvicorn', 'typing_extensions']:
    try:
        tmp_datas, tmp_binaries, tmp_hidden = collect_all(pkg)
        datas += tmp_datas
        binaries += tmp_binaries
        hiddenimports += tmp_hidden
    except ImportError:
        pass # Skip if a sub-dep isn't found

a = Analysis(
    ['src/main.py'],
    pathex=[os.path.abspath("src"), site_packages],
    binaries=binaries,
    datas=datas,
    hiddenimports=hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
)

pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='sonosano-backend',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
