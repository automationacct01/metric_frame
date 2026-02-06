# -*- mode: python ; coding: utf-8 -*-


a = Analysis(
    ['desktop_entry.py'],
    pathex=[],
    binaries=[],
    datas=[('src/seeds', 'seeds'), ('src/data', 'src/data')],
    hiddenimports=['uvicorn.logging', 'uvicorn.lifespan', 'uvicorn.lifespan.on', 'uvicorn.lifespan.off', 'uvicorn.protocols', 'uvicorn.protocols.http', 'uvicorn.protocols.http.auto', 'uvicorn.protocols.http.h11_impl', 'uvicorn.protocols.http.httptools_impl', 'uvicorn.protocols.websockets', 'uvicorn.protocols.websockets.auto', 'uvicorn.protocols.websockets.wsproto_impl', 'uvicorn.protocols.websockets.websockets_impl', 'uvicorn.loops', 'uvicorn.loops.auto', 'uvicorn.loops.asyncio', 'uvicorn.loops.uvloop', 'passlib.handlers.bcrypt', 'passlib.handlers', 'bcrypt', 'sqlalchemy.dialects.sqlite', 'aiosqlite', 'anthropic', 'openai', 'together', 'httpx', 'httpcore', 'anyio', 'sniffio', 'certifi', 'charset_normalizer', 'idna', 'h11', 'socksio', 'pydantic', 'pydantic_core', 'annotated_types'],
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
    name='metricframe-backend',
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
