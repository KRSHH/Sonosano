# -*- mode: python ; coding: utf-8 -*-

from PyInstaller.utils.hooks import collect_data_files

datas = [('src/pynicotine', 'pynicotine')]
datas += collect_data_files('uroman')

excluded_modules = [
    'tkinter', 'test', 'unittest', 'pydoc', 'pdb', 'distutils',
    'PyQt5', 'PyQt6', 'PySide2', 'PySide6', 'wx', 'Gtk', 'GTK', 
    'pandas', 'notebook', 'share', 'icons', 'ipython', 'jedi'
]

a = Analysis(
    ['src/main.py'],
    pathex=[],
    binaries=[],
    datas=datas,
    hiddenimports=[],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=excluded_modules,
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
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)