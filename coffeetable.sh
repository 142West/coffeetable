#!/bin/bash
# Starts the Coffeetable server, which in turn opens Firefox fullscreen on the table.
# Run by the desktop session's autostart -- see coffeetable.desktop. Firefox needs
# the graphical session, so this is not a systemd service.

DIR="$(cd "$(dirname "$0")" && pwd)"
PYTHON="${COFFEETABLE_PYTHON:-$DIR/.venv/bin/python}"
LOG="$DIR/coffeetable.log"

# Belt-and-suspenders screen blanking disable (X11 only -- these are no-ops
# and safely ignored under Wayland/labwc; use raspi-config's Display Options
# -> Screen Blanking for a setting that applies under both).
xset s off      2>/dev/null
xset s noblank  2>/dev/null
xset -dpms      2>/dev/null

# Hide the mouse cursor when idle, if installed
command -v unclutter >/dev/null && unclutter -idle 0.5 -root &

cd "$DIR" || exit 1

# Keep the table running: if the server crashes, clean up and start it again
while true; do
    # Don't let a crashed run leave a stray Firefox window behind the new one
    pkill -f geckodriver       2>/dev/null
    pkill -f -- '-marionette'  2>/dev/null

    # Keep the log from growing forever
    [ -f "$LOG" ] && [ "$(stat -c %s "$LOG" 2>/dev/null || echo 0)" -gt 10485760 ] && mv "$LOG" "$LOG.1"

    echo "=== Coffeetable starting $(date) ===" >> "$LOG"
    PYTHONUNBUFFERED=1 "$PYTHON" "$DIR/run.py" >> "$LOG" 2>&1
    echo "=== Coffeetable exited with status $? $(date) -- restarting in 5s ===" >> "$LOG"
    sleep 5
done
