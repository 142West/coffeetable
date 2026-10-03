#!/bin/bash
# Hides the mouse cursor on a Wayland (labwc) desktop by installing a fully
# transparent cursor theme and making it the desktop's cursor theme.
# unclutter only works under X11, so this is the Wayland equivalent.
#
#   ./hide-cursor.sh          install and enable the invisible cursor
#   ./hide-cursor.sh --undo   go back to the normal cursor
#
# Run once as the desktop user (not with sudo), then reboot.

THEME="coffeetable-invisible"
THEME_DIR="$HOME/.local/share/icons/$THEME"
LABWC_ENV="$HOME/.config/labwc/environment"
GTK_INI="$HOME/.config/gtk-3.0/settings.ini"

if [ "$EUID" -eq 0 ]; then
    echo "Run this as the desktop user (e.g. pi), not with sudo." >&2
    exit 1
fi

# Removes our settings from labwc's environment and GTK's settings.ini
clear_settings() {
    [ -f "$LABWC_ENV" ] && sed -i '/^XCURSOR_THEME=/d' "$LABWC_ENV"
    [ -f "$GTK_INI" ]   && sed -i '/^gtk-cursor-theme-name=/d' "$GTK_INI"
}

if [ "$1" = "--undo" ]; then
    clear_settings
    gsettings reset org.gnome.desktop.interface cursor-theme 2>/dev/null
    rm -rf "$THEME_DIR"
    echo "Normal cursor restored. Reboot to apply."
    exit 0
fi

# --- 1. Build the theme: one transparent cursor, linked under every cursor name ---
mkdir -p "$THEME_DIR/cursors"
cat > "$THEME_DIR/index.theme" <<EOF
[Icon Theme]
Name=$THEME
Comment=Fully transparent cursor for kiosk displays
EOF

python3 - "$THEME_DIR/cursors/default" <<'EOF'
# Writes an Xcursor file whose images are entirely transparent pixels
import struct, sys
sizes = [24, 32, 48, 64]
header = struct.pack("<4sIII", b"Xcur", 16, 0x10000, len(sizes))
toc, images = b"", b""
offset = 16 + 12 * len(sizes)
for size in sizes:
    toc += struct.pack("<III", 0xFFFD0002, size, offset + len(images))
    images += struct.pack("<9I", 36, 0xFFFD0002, size, 1, size, size, 0, 0, 0)
    images += b"\0" * (4 * size * size)
open(sys.argv[1], "wb").write(header + toc + images)
EOF

# Every name an app or the compositor might ask for -- any name left out
# would fall back to the normal theme and the cursor would reappear
NAMES="left_ptr arrow top_left_arrow pointer hand hand1 hand2 pointing_hand
text xterm ibeam vertical-text wait watch progress left_ptr_watch half-busy
crosshair cross tcross cell plus help question_arrow context-menu alias copy
dnd-copy dnd-link dnd-move dnd-none dnd-ask link move fleur all-scroll grab
grabbing openhand closedhand no-drop not-allowed forbidden circle zoom-in
zoom-out col-resize row-resize sb_h_double_arrow sb_v_double_arrow
size_hor size_ver size_bdiag size_fdiag size_all split_h split_v
e-resize w-resize n-resize s-resize ne-resize nw-resize se-resize sw-resize
ew-resize ns-resize nesw-resize nwse-resize right_side left_side top_side
bottom_side top_right_corner top_left_corner bottom_right_corner
bottom_left_corner h_double_arrow v_double_arrow pirate X_cursor center_ptr
right_ptr draft_large draft_small dotbox target ul_angle ur_angle ll_angle
lr_angle up-arrow down-arrow right-arrow left-arrow"
for name in $NAMES; do
    ln -sf default "$THEME_DIR/cursors/$name"
done

# --- 2. Make it the cursor theme everywhere the desktop looks ---
clear_settings

# labwc (the compositor's own cursor). labwc may only read the user's file
# when it exists, so start it from the system defaults to keep them.
mkdir -p "$(dirname "$LABWC_ENV")"
[ -f "$LABWC_ENV" ] || cp /etc/xdg/labwc/environment "$LABWC_ENV" 2>/dev/null || touch "$LABWC_ENV"
echo "XCURSOR_THEME=$THEME" >> "$LABWC_ENV"

# GTK apps such as Firefox pick their own cursor from GTK's settings
gsettings set org.gnome.desktop.interface cursor-theme "$THEME" 2>/dev/null
mkdir -p "$(dirname "$GTK_INI")"
[ -f "$GTK_INI" ] || echo "[Settings]" > "$GTK_INI"
grep -q '^\[Settings\]' "$GTK_INI" || echo "[Settings]" >> "$GTK_INI"
sed -i "/^\[Settings\]/a gtk-cursor-theme-name=$THEME" "$GTK_INI"

echo "Invisible cursor installed. Reboot to apply: sudo reboot"
echo "To undo later: $0 --undo"
