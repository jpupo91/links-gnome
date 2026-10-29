#!/bin/sh
set -eu

ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
DIST_DIR="$ROOT/dist"
SCHEMA="$ROOT/schemas/org.gnome.shell.extensions.links-gnome.gschema.xml"

if ! command -v gnome-extensions >/dev/null 2>&1; then
    printf '%s\n' 'Falta gnome-extensions. Instala GNOME Shell para crear el paquete.' >&2
    exit 1
fi

mkdir -p "$DIST_DIR"
gnome-extensions pack \
    --force \
    --schema="$SCHEMA" \
    --out-dir="$DIST_DIR" \
    "$ROOT"

printf 'Paquete creado: %s\n' "$DIST_DIR/links-gnome@jpupo91.shell-extension.zip"
