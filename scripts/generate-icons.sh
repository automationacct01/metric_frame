#!/bin/bash
# Generate app icons from SVG source
#
# Prerequisites:
#   - macOS: Built-in tools (sips, iconutil)
#   - Linux/Windows: ImageMagick (convert command)
#   - All: librsvg (rsvg-convert) for SVG to PNG
#
# Usage:
#   ./scripts/generate-icons.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BUILD_DIR="$PROJECT_ROOT/desktop/build"
ICON_SVG="$BUILD_DIR/icon.svg"

echo "============================================"
echo "  Generating App Icons"
echo "============================================"
echo ""

# Check for SVG source
if [ ! -f "$ICON_SVG" ]; then
    echo "Error: icon.svg not found at $ICON_SVG"
    exit 1
fi

# Create temporary directory
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

echo "Source: $ICON_SVG"
echo "Output: $BUILD_DIR"
echo ""

# Function to convert SVG to PNG
convert_svg_to_png() {
    local size=$1
    local output=$2

    if command -v rsvg-convert &> /dev/null; then
        rsvg-convert -w "$size" -h "$size" "$ICON_SVG" -o "$output"
    elif command -v convert &> /dev/null; then
        convert -background none -resize "${size}x${size}" "$ICON_SVG" "$output"
    elif command -v sips &> /dev/null; then
        # macOS fallback - need to use a workaround
        # First create a large PNG using qlmanage
        qlmanage -t -s 1024 -o "$TEMP_DIR" "$ICON_SVG" 2>/dev/null || true
        if [ -f "$TEMP_DIR/icon.svg.png" ]; then
            sips -z "$size" "$size" "$TEMP_DIR/icon.svg.png" --out "$output" 2>/dev/null
        else
            echo "Warning: Could not convert SVG on macOS without rsvg-convert"
            return 1
        fi
    else
        echo "Error: No SVG converter found. Install librsvg or ImageMagick."
        return 1
    fi
}

# Generate main PNG icon (512x512)
echo "Generating PNG icon (512x512)..."
if convert_svg_to_png 512 "$BUILD_DIR/icon.png"; then
    echo "✓ Created icon.png"
else
    echo "✗ Failed to create icon.png"
fi

# Generate macOS iconset
echo ""
echo "Generating macOS iconset..."
ICONSET_DIR="$TEMP_DIR/icon.iconset"
mkdir -p "$ICONSET_DIR"

# macOS requires these specific sizes
SIZES="16 32 64 128 256 512"
for size in $SIZES; do
    convert_svg_to_png "$size" "$ICONSET_DIR/icon_${size}x${size}.png" 2>/dev/null || true
    # Retina versions (@2x)
    double=$((size * 2))
    if [ $double -le 1024 ]; then
        convert_svg_to_png "$double" "$ICONSET_DIR/icon_${size}x${size}@2x.png" 2>/dev/null || true
    fi
done

# Create .icns using iconutil (macOS only)
if command -v iconutil &> /dev/null; then
    iconutil -c icns "$ICONSET_DIR" -o "$BUILD_DIR/icon.icns" 2>/dev/null
    if [ -f "$BUILD_DIR/icon.icns" ]; then
        echo "✓ Created icon.icns"
    else
        echo "✗ Failed to create icon.icns (iconutil error)"
    fi
else
    echo "⚠ iconutil not available (macOS only) - skipping .icns"
fi

# Generate Windows ICO
echo ""
echo "Generating Windows ICO..."
if command -v convert &> /dev/null; then
    # ImageMagick can create ICO files
    # ICO needs multiple sizes: 16, 32, 48, 64, 128, 256
    ICO_SIZES="16 32 48 64 128 256"
    ICO_FILES=""
    for size in $ICO_SIZES; do
        png_file="$TEMP_DIR/ico_${size}.png"
        convert_svg_to_png "$size" "$png_file" 2>/dev/null || true
        if [ -f "$png_file" ]; then
            ICO_FILES="$ICO_FILES $png_file"
        fi
    done

    if [ -n "$ICO_FILES" ]; then
        convert $ICO_FILES "$BUILD_DIR/icon.ico" 2>/dev/null
        if [ -f "$BUILD_DIR/icon.ico" ]; then
            echo "✓ Created icon.ico"
        else
            echo "✗ Failed to create icon.ico"
        fi
    fi
else
    echo "⚠ ImageMagick not available - skipping .ico"
    echo "  Install with: brew install imagemagick"
fi

echo ""
echo "============================================"
echo "  Icon Generation Complete"
echo "============================================"
echo ""
echo "Generated files:"
ls -la "$BUILD_DIR"/icon.* 2>/dev/null || echo "  (no icon files generated)"
echo ""
echo "If icons are missing, install required tools:"
echo "  macOS:  brew install librsvg imagemagick"
echo "  Linux:  apt install librsvg2-bin imagemagick"
echo ""
