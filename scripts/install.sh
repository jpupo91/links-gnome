#!/bin/sh
set -eu

UUID="links-gnome@jpupo91"
ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
DATA_HOME=${XDG_DATA_HOME:-"$HOME/.local/share"}
EXTENSION_DIR="$DATA_HOME/gnome-shell/extensions/$UUID"
APPLICATIONS_DIR="$DATA_HOME/applications"

if ! command -v glib-compile-schemas >/dev/null 2>&1; then
    printf '%s\n' 'Falta glib-compile-schemas. Instala glib2 o libglib2.0-bin.' >&2
    exit 1
fi

mkdir -p "$EXTENSION_DIR/schemas" "$APPLICATIONS_DIR"
for file in metadata.json extension.js prefs.js url-handler.js; do
    install -m 644 "$ROOT/$file" "$EXTENSION_DIR/$file"
done
install -m 644 "$ROOT/schemas/org.gnome.shell.extensions.links-gnome.gschema.xml" \
    "$EXTENSION_DIR/schemas/org.gnome.shell.extensions.links-gnome.gschema.xml"
glib-compile-schemas "$EXTENSION_DIR/schemas"

cat > "$APPLICATIONS_DIR/links-gnome-url-handler.desktop" <<EOF
[Desktop Entry]
Type=Application
Name=Links GNOME URL Handler
NoDisplay=true
Terminal=false
Exec=gjs -m "$EXTENSION_DIR/url-handler.js" %u
MimeType=x-scheme-handler/http;x-scheme-handler/https;
EOF

if command -v update-desktop-database >/dev/null 2>&1; then
    update-desktop-database "$APPLICATIONS_DIR"
else
    printf '%s\n' 'Aviso: no se encontró update-desktop-database; el escritorio puede tardar en detectar el manejador.'
fi

printf 'Extensión instalada en: %s\n' "$EXTENSION_DIR"
printf 'Manejador instalado en: %s\n' "$APPLICATIONS_DIR/links-gnome-url-handler.desktop"
printf '%s\n' \
    'Para activarla: gnome-extensions enable links-gnome@jpupo91' \
    'Para enrutar enlaces: xdg-mime default links-gnome-url-handler.desktop x-scheme-handler/http' \
    '                  xdg-mime default links-gnome-url-handler.desktop x-scheme-handler/https'
