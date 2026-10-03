# Coffeetable

> What if the coffee table was more than just a table?

Turns the coffee table's built-in screen into a party game console. The table shows fullscreen games and visuals (Asteroids, Pool, 3-2-1 Vampire, Lazors...), and anyone on the LAN can open the table's web page on their phone to use it as a controller and switch between pages. Web app written in [sanic](https://sanic.dev); everything starts automatically on boot with no login required.

## How It Works

One process does everything. `run.py` starts the sanic server, and the server opens Firefox fullscreen on the table's display through Selenium:

| Piece | What it does |
|---|---|
| sanic server (`server.py`) | Serves the phone controller UI from `static/` on port **8081**, and relays WebSocket messages between phones and the page on the table |
| Table runner (`run.py`) | Drives a kiosk Firefox window via Selenium and loads whichever page is selected from `pages/` |
| Launcher (`coffeetable.sh`) | Started by the desktop autostart, runs the server and restarts it if it ever crashes |

Firefox needs an active graphical session (X11/Wayland), so the whole thing is started by the desktop itself through XDG autostart and not by systemd. This is the same approach as the kiosk half of picklecast-kiosk.

```
phone browser  --ws /connect------>  server  --ws /hostconnect-->  page running in Firefox on the table
               <-------------------          <-------------------
```

Phones connect to `/connect` and get a unique color, the page list, and the current page. The page on the table connects to `/hostconnect` (only allowed from the table itself) and receives every phone's taps, swipes, joystick, and text input. See `map.txt` for the packet format.

---

## Hardware

| Component | Notes |
|---|---|
| Display | The plasma panel built into the table (Pioneer PDP-502MX). Manuals are in `documents/` |
| Computer | Raspberry Pi 4/5 (or any Linux PC) connected to the display over HDMI |
| Controllers | Anyone's phone, using any browser, on the same LAN |

---

## Requirements

- Raspberry Pi 4 or newer recommended (Firefox plus canvas animations are CPU/GPU heavy)
- Raspberry Pi OS **with Desktop** (not Lite, because a GUI is required for the kiosk browser)
- **Python 3.11** for the app itself. The pinned `sanic==21.6.0` stack won't build on newer Python versions (current Raspberry Pi OS ships 3.13), so step 3 uses [uv](https://docs.astral.sh/uv/) to give the app its own Python 3.11. You don't need to change the system Python.

These instructions assume the default `pi` user and that the repo lives in `/home/pi/coffeetable`. If yours differ, update the path in `coffeetable.desktop`.

---

## 1. Flash & Configure Pi OS

Flash **Raspberry Pi OS with Desktop** using Raspberry Pi Imager. In the imager's advanced settings (gear icon):
- Set hostname (e.g. `coffeetable`)
- Enable SSH
- Configure WiFi (if not using ethernet)

After first boot, enable desktop autologin so it doesn't sit at a login screen:

```bash
sudo raspi-config
# System Options -> Boot / Auto Login -> Desktop Autologin
```

While you're in `raspi-config`, also disable screen blanking so the table doesn't go dark:

```
Display Options -> Screen Blanking -> No
```

---

## 2. Install Dependencies

```bash
sudo apt update
sudo apt install python3-full firefox curl git -y
```

If `firefox` isn't found on your OS version, install `firefox-esr` instead.

Selenium also needs **geckodriver**, the bridge between Selenium and Firefox. Selenium can't download it automatically on ARM Linux, so install it by hand from [Mozilla's releases](https://github.com/mozilla/geckodriver/releases):

```bash
GECKO=0.37.1   # latest release at time of writing
curl -L https://github.com/mozilla/geckodriver/releases/download/v$GECKO/geckodriver-v$GECKO-linux-aarch64.tar.gz \
    | sudo tar -xz -C /usr/local/bin
geckodriver --version
```

On a 32-bit OS use `linux32`, or `linux64` on an x86 PC, in place of `linux-aarch64`.

---

## 3. Install the Project

```bash
git clone https://github.com/142West/coffeetable.git /home/pi/coffeetable
cd /home/pi/coffeetable
chmod +x coffeetable.sh

# Install uv, then build a Python 3.11 environment for the app
curl -LsSf https://astral.sh/uv/install.sh | sh
~/.local/bin/uv venv -p 3.11 .venv
VIRTUAL_ENV=.venv ~/.local/bin/uv pip install -r requirements.txt
```

uv downloads a standalone Python 3.11 the first time (it doesn't touch the system's `python3`), and installs the pinned packages into it. One or two older packages are compiled on the Pi, which can take a minute or two. The launcher looks for the environment at `.venv` inside the repo (it's already in `.gitignore`), so the pinned packages stay separate from anything else on the Pi.

Don't use `python3 -m venv` + `pip` here. On Python 3.12+ the pinned `httptools`, `multidict`, and `uvloop` fail to compile with errors like `too few arguments to function '_PyLong_AsByteArray'`. If you already tried that, `rm -rf .venv` and run the uv commands above.

Test it manually before wiring up autostart. Run it from a terminal **on the Pi's desktop** (not over plain SSH, since Firefox needs the display):

```bash
/home/pi/coffeetable/.venv/bin/python /home/pi/coffeetable/run.py
```

Firefox should open fullscreen showing the default page (Lazors), and the terminal should show `Goin' Fast @ http://0.0.0.0:8081`. From your phone, open:

```
http://<pi-ip-or-hostname>:8081/
```

You should get a colored controller and a list of pages. Picking one should switch what's on the table. Press Ctrl-C in the terminal to stop the test run.

---

## 4. Install the Autostart Entry

```bash
mkdir -p /home/pi/.config/autostart
cp /home/pi/coffeetable/coffeetable.desktop /home/pi/.config/autostart/
```

This uses the standard XDG autostart mechanism, which Raspberry Pi OS's desktop honors under both X11 and the newer Wayland/labwc compositor.

---

## 5. Hide the Mouse Cursor

Wayland always shows the cursor, even with no mouse moving, so it would sit on top of the games. `hide-cursor.sh` installs a fully transparent cursor theme and makes it the desktop's cursor, both for labwc and for GTK apps like Firefox. Run it once as `pi` (not with sudo):

```bash
/home/pi/coffeetable/hide-cursor.sh
```

It takes effect after the reboot in the next step. To get the normal cursor back (e.g. for debugging with a mouse), run `/home/pi/coffeetable/hide-cursor.sh --undo` and reboot.

The usual X11 tool for this, `unclutter`, does nothing under Wayland. The launcher still runs it if it's installed, so the cursor also hides on a Pi switched to X11 in `raspi-config`.

---

## 6. Reboot and Verify

```bash
sudo reboot
```

The Pi should boot straight to the desktop, then within a few seconds Firefox opens fullscreen showing the default page. Open `http://<pi-ip-or-hostname>:8081/` on a phone to play.

Tip: put that URL in a QR code on or near the table so guests can join without typing.

---

## Managing It

The launcher logs everything (server output and crashes) to `/home/pi/coffeetable/coffeetable.log`. When the log passes 10 MB it's rotated to `coffeetable.log.1`.

```bash
# Watch live logs
tail -f /home/pi/coffeetable/coffeetable.log

# Restart the app (e.g. after a git pull) -- the launcher brings it back within ~5s
pkill -f coffeetable/run.py

# Stop it completely until the next reboot
pkill -f coffeetable.sh; pkill -f coffeetable/run.py; pkill -f geckodriver; pkill -f -- -marionette
```

If the server crashes, the launcher closes any leftover Firefox/geckodriver processes and starts a fresh copy after 5 seconds.

---

## Pages

Each selectable page is a YAML file in `pages/` pointing at a folder of HTML/JS in `pages/data/`:

```yaml
# pages/pool.yaml
name: Pool        # name shown in the phone's page list (defaults to the filename)
dir: pool         # folder inside pages/data/
index: index.html # entry file inside that folder (default: index.html)
refresh: -1       # seconds between automatic page reloads; -1 = never (default: -1)
```

To add a page, drop its files in `pages/data/<name>/`, add `pages/<name>.yaml`, and restart. Pages talk to the server and phones through `pages/data/common/host.js`. Include it, call `HOST.init()`, and set handlers such as `HOST.ontap`, `HOST.ondirection`, `HOST.onjoystick`, `HOST.ontext`, `HOST.onuserjoin`, and `HOST.onuserleave`. Look at an existing page like `pool` or `asteroids` for a working example.

The page shown at boot is set by `DEFAULT_PAGE` at the top of `run.py` (default `lasers`).

## Launcher Options

| Variable | Default | Description |
|---|---|---|
| `COFFEETABLE_PYTHON` | `<repo>/.venv/bin/python` | Python interpreter used to run `run.py`. Set it in `coffeetable.desktop`'s `Exec` line (e.g. `Exec=env COFFEETABLE_PYTHON=/home/pi/venv/bin/python /home/pi/coffeetable/coffeetable.sh`) if your environment lives elsewhere |

---

## Troubleshooting

- **`Failed building wheel for httptools` / `multidict` / `uvloop`**: the venv was made with the system Python (3.12+). `rm -rf /home/pi/coffeetable/.venv` and redo the uv commands in section 3.
- **`Unable to obtain driver for firefox using Selenium Manager`**: geckodriver isn't installed or isn't on `PATH`. Redo the geckodriver step in section 2 and check `which geckodriver`.
- **`Message: Process unexpectedly closed with status 1`**: Firefox couldn't open a window. Make sure you're running from the desktop session (autostart or a desktop terminal), not a bare SSH shell.
- **Phones can't load the page**: check the Pi's IP with `hostname -I`, confirm the server is up with `curl http://localhost:8081/` on the Pi, and make sure the phone is on the same network (not a guest WiFi that isolates clients).
- **Phones connect but nothing happens on the table**: the page on the table talks to the server at `ws://localhost:8081/hostconnect`. Check the log for `HOST CONNECTION FAILED`.
- **A page in the list shows "File not found"**: its `pages/data/<dir>` folder is missing. `wikitrivia` currently has a YAML file but no data folder.
- **Cursor still visible after running `hide-cursor.sh`**: make sure you rebooted, and that you ran it as `pi` rather than with sudo. Check that `grep XCURSOR /home/pi/.config/labwc/environment` shows `XCURSOR_THEME=coffeetable-invisible` and `gsettings get org.gnome.desktop.interface cursor-theme` shows `'coffeetable-invisible'`.
- **Need to get to the desktop for debugging**: SSH in and stop it (see Managing It above), or press Alt+F4 on a keyboard plugged into the Pi.
