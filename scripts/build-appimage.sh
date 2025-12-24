#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APPDIR="$ROOT/package/Sonosano.AppDir"
DISTDIR="$ROOT/dist"
UNPACKED="$DISTDIR/linux-unpacked"
BACKEND_DIR="$ROOT/backend"
VENV="$BACKEND_DIR/.venv"
ELECTRON_EXE="sonosano"
APPIMAGE_OUT="$ROOT/package/Sonosano-x86_64.AppImage"

die() { echo "ERROR: $*" >&2; exit 1; }

echo ">>> Repo root: $ROOT"
echo ">>> AppDir: $APPDIR"

[ -f "$ROOT/package.json" ] || die ">>> package.json not found at $ROOT"
command -v node >/dev/null || die ">>> node not found"
command -v npm >/dev/null || die ">>> npm not found"
command -v python >/dev/null || die ">>> python not found"
command -v appimagetool >/dev/null || die ">>> appimagetool not found (install: sudo pacman -S appimagetool)"

echo ">>> Installing npm dependencies..."
cd "$ROOT"
npm install

echo ">>> Building backend..."
cd "$BACKEND_DIR"

rm -rf "$BACKEND_DIR/dist" "$BACKEND_DIR/build" "$VENV"

python -m venv "$VENV"
VENV_PY="$VENV/bin/python"

"$VENV_PY" -m pip install --upgrade pip setuptools wheel
"$VENV_PY" -m pip install -r requirements.txt
"$VENV_PY" -m pip install "fastapi" "uvicorn[standard]"
"$VENV_PY" -c "import fastapi, uvicorn; print('fastapi ok:', fastapi.__version__)"

"$VENV_PY" -m pip install pyinstaller
"$VENV_PY" -m pip install --upgrade pyinstaller
"$VENV_PY" -m PyInstaller sonosano.spec --clean --noconfirm

BACKEND_ONEFILE="$BACKEND_DIR/dist/sonosano-backend"
BACKEND_ONEDIR="$BACKEND_DIR/dist/sonosano-backend"
BACKEND_ONEDIR_EXE="$BACKEND_DIR/dist/sonosano-backend/sonosano-backend"

BACKEND_MODE=""
if [ -f "$BACKEND_ONEFILE" ]; then
  BACKEND_MODE="onefile"
  echo ">>> Backend mode: onefile ($BACKEND_ONEFILE)"
elif [ -f "$BACKEND_ONEDIR_EXE" ]; then
  BACKEND_MODE="onedir"
  echo ">>> Backend mode: onedir ($BACKEND_ONEDIR)"
else
  echo ">>> Backend dist contents:" >&2
  ls -la "$BACKEND_DIR/dist" >&2 || true
  die ">>> Backend output not found under backend/dist"
fi

echo ">>> Building app (produces out/main/main.js)"
cd "$ROOT"
npm run build
[ -f "$ROOT/out/main/main.js" ] || die ">>> Missing out/main/main.js after npm run build"

echo ">>> Packaging Electron..."
rm -rf "$UNPACKED"
npx electron-builder --linux dir

[ -d "$UNPACKED" ] || die ">>> dist/linux-unpacked not found"
[ -f "$UNPACKED/$ELECTRON_EXE" ] || die ">>> Expected executable not found: $UNPACKED/$ELECTRON_EXE"
chmod +x "$UNPACKED/$ELECTRON_EXE" || true

echo ">>> Assembling AppDir..."
mkdir -p "$APPDIR/usr/bin"
mkdir -p "$APPDIR/usr/lib/sonosano"

rm -rf "$APPDIR/usr/lib/sonosano"/*
cp -a "$UNPACKED/"* "$APPDIR/usr/lib/sonosano/"

BACKEND_RES_DIR="$APPDIR/usr/lib/sonosano/resources/backend"
mkdir -p "$BACKEND_RES_DIR"

if [ "$BACKEND_MODE" = "onefile" ]; then
  cp -a "$BACKEND_ONEFILE" "$BACKEND_RES_DIR/sonosano-backend"
  chmod +x "$BACKEND_RES_DIR/sonosano-backend"
else
  rm -rf "$BACKEND_RES_DIR/sonosano-backend.bundle"
  mkdir -p "$BACKEND_RES_DIR/sonosano-backend.bundle"
  cp -a "$BACKEND_ONEDIR/"* "$BACKEND_RES_DIR/sonosano-backend.bundle/"
  chmod +x "$BACKEND_RES_DIR/sonosano-backend.bundle/sonosano-backend"

  cat > "$BACKEND_RES_DIR/sonosano-backend" <<'EOF'
#!/bin/sh
HERE="$(dirname "$(readlink -f "$0")")"
exec "$HERE/sonosano-backend.bundle/sonosano-backend" "$@"
EOF
  chmod +x "$BACKEND_RES_DIR/sonosano-backend"
fi

cat > "$APPDIR/usr/bin/sonosano-backend" <<'EOF'
#!/bin/sh
HERE="$(dirname "$(readlink -f "$0")")"
exec "$HERE/../lib/sonosano/resources/backend/sonosano-backend" "$@"
EOF
chmod +x "$APPDIR/usr/bin/sonosano-backend"

cat > "$APPDIR/usr/bin/launcher" <<EOF
#!/bin/sh
HERE="\$(dirname "\$(readlink -f "\$0")")"
exec "\$HERE/../lib/sonosano/${ELECTRON_EXE}"
EOF
chmod +x "$APPDIR/usr/bin/launcher"

cat > "$APPDIR/AppRun" <<'EOF'
#!/bin/sh
HERE="$(dirname "$(readlink -f "$0")")"
exec "$HERE/usr/bin/launcher"
EOF
chmod +x "$APPDIR/AppRun"

cat > "$APPDIR/sonosano.desktop" <<'EOF'
[Desktop Entry]
Type=Application
Name=Sonosano
Exec=launcher
Icon=sonosano
Categories=Audio;Utility;
EOF

if [ ! -f "$APPDIR/sonosano.png" ]; then
  ICON_CANDIDATE="$(find "$ROOT/resources" -type f \( -iname "*icon*.png" -o -iname "sonosano*.png" \) 2>/dev/null | head -n 1 || true)"
  if [ -n "$ICON_CANDIDATE" ]; then
    cp -a "$ICON_CANDIDATE" "$APPDIR/sonosano.png"
  else
    echo ">>> WARNING: No icon found automatically. Put a PNG at: $APPDIR/sonosano.png"
  fi
fi

echo ">>> Building AppImage..."
cd "$ROOT/package"
rm -f "$APPIMAGE_OUT"
appimagetool "Sonosano.AppDir"
[ -f "$APPIMAGE_OUT" ] || die ">>> AppImage not created at $APPIMAGE_OUT"

# echo ">>> Verifying backend inside the built AppImage..."
# cd "$ROOT/package"
# rm -rf squashfs-root
# "$APPIMAGE_OUT" --appimage-extract >/dev/null
#
# BACKEND_IN_APPIMAGE="squashfs-root/usr/lib/sonosano/resources/backend/sonosano-backend"
# [ -f "$BACKEND_IN_APPIMAGE" ] || die ">>> Backend missing inside AppImage at $BACKEND_IN_APPIMAGE"
# chmod +x "$BACKEND_IN_APPIMAGE" || true
#
# set +e
# OUT="$("$BACKEND_IN_APPIMAGE" 2>&1 | head -n 40)"
# set -e
# echo "$OUT" | grep -q ">>> No module named 'fastapi'" && die "Backend inside AppImage is missing fastapi (copy/bundle issue)."
# echo ">>> Backend inside AppImage looks OK"

echo ">>> AppImage built successfully!"
echo ">>> Output: $APPIMAGE_OUT"
echo ">>> Run:"
echo ">>> SONOSANO_DISABLE_UPDATES=1 $APPIMAGE_OUT"

