# -*- mode: python ; coding: utf-8 -*-
"""PyInstaller spec file for MetricFrame backend."""

import sys
import os

block_cipher = None

# Get the backend directory
backend_dir = os.path.dirname(os.path.abspath(SPEC))
src_dir = os.path.join(backend_dir, 'src')

a = Analysis(
    ['desktop_main.py'],
    pathex=[backend_dir, src_dir],
    binaries=[],
    datas=[
        ('src/seeds', 'src/seeds'),
        ('src', 'src'),  # Include the entire src package
    ],
    hiddenimports=[
        'uvicorn',
        'uvicorn.logging',
        'uvicorn.loops',
        'uvicorn.loops.auto',
        'uvicorn.loops.asyncio',
        'uvicorn.protocols',
        'uvicorn.protocols.http',
        'uvicorn.protocols.http.auto',
        'uvicorn.protocols.http.h11_impl',
        'uvicorn.protocols.http.httptools_impl',
        'uvicorn.protocols.websockets',
        'uvicorn.protocols.websockets.auto',
        'uvicorn.protocols.websockets.websockets_impl',
        'uvicorn.lifespan',
        'uvicorn.lifespan.off',
        'uvicorn.lifespan.on',
        'sqlalchemy',
        'sqlalchemy.dialects.sqlite',
        'sqlalchemy.dialects.postgresql',
        'sqlalchemy.ext.declarative',
        'bcrypt',
        'cryptography',
        'email_validator',
        'slowapi',
        'fastapi',
        'starlette',
        'pydantic',
        'pydantic_core',
        'src',
        'src.main',
        'src.db',
        'src.models',
        'src.schemas',
        'src.routers',
        'src.routers.metrics',
        'src.routers.scores',
        'src.routers.ai',
        'src.routers.csf',
        'src.routers.catalogs',
        'src.routers.frameworks',
        'src.routers.ai_providers',
        'src.routers.users',
        'src.routers.auth',
        'src.services',
        'src.services.scoring',
        'src.services.ai_client',
        'src.services.catalog_scoring',
        'src.services.csf_reference',
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
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
