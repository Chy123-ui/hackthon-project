# -*- mode: python ; coding: utf-8 -*-


a = Analysis(
    ['D:\\Desktop\\temp\\pro\\backend\\launcher.py'],
    pathex=[],
    binaries=[],
    datas=[('D:\\Desktop\\temp\\pro\\backend\\protocol', 'protocol'), ('D:\\Desktop\\temp\\pro\\backend\\default_worlds', 'default_worlds'), ('D:\\Desktop\\temp\\pro\\frontend\\dist', 'dist')],
    hiddenimports=[],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
    optimize=0,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name='re-life',
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
