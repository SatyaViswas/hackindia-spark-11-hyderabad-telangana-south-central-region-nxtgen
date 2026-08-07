"""Shared anti-fingerprinting config for every Playwright browser this app
launches (whatsapp_engine.py's QR session, browser_login_engine.py's
headed login-capture window, browser_engine.py's task-execution agent).

Bot-management services (Akamai/DataDome/PerimeterX-style — common on
ticketing/high-fraud-risk sites) key heavily off `navigator.webdriver`, the
flag Chromium sets whenever it's driven over the DevTools Protocol, which is
exactly how every Playwright browser works regardless of headless/headed.
whatsapp_engine.py already had to work around this once (see its own
comment: hiding navigator.webdriver is "what actually gets the real QR to
render") — this module is that same fix, generalized and shared, instead of
living only in the one engine that happened to need it first.

This meaningfully reduces false blocks on sites that key off these signals
— the overwhelming majority of "access denied" cases — but isn't a
guarantee against every bot-detection system; enterprise-grade services also
fingerprint things (CDP protocol timing, canvas/audio entropy, IP
reputation) that no launch-flag tuning fully defeats.
"""

import glob
import os

# Common install paths for a real, non-Playwright-bundled Google Chrome.
# Preferred over Playwright's own bundled "Chrome for Testing" build when
# available — a real, auto-updating Chrome carries a more normal
# fingerprint (populated navigator.plugins, standard DRM/codec support,
# a version actually in wide real-world use).
_REAL_CHROME_PATHS = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",  # macOS
    "/usr/bin/google-chrome",  # Linux
    "/usr/bin/google-chrome-stable",  # Linux
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",  # Windows
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",  # Windows
]


def _has_real_chrome() -> bool:
    return any(os.path.exists(p) for p in _REAL_CHROME_PATHS)


def find_bundled_chromium() -> str | None:
    """Locates Playwright's own cached "Chrome for Testing" build — used
    only as a fallback when a real Chrome install (see _has_real_chrome)
    isn't found, e.g. a server/CI box."""
    patterns = [
        os.path.expanduser(
            "~/Library/Caches/ms-playwright/chromium-*/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing"
        ),
        os.path.expanduser("~/Library/Caches/ms-playwright/chromium-*/chrome-mac/Chromium.app/Contents/MacOS/Chromium"),
    ]
    for pattern in patterns:
        matches = glob.glob(pattern)
        if matches:
            return matches[0]
    return None


def chromium_launch_kwargs(headless: bool) -> dict:
    """Shared `playwright.chromium.launch(**kwargs)` config: prefers a real
    installed Chrome (via Playwright's `channel="chrome"`) over the bundled
    testing build, and strips the two most common automation tells —
    the `--enable-automation` infobar/flag and the `AutomationControlled`
    blink feature that sets `navigator.webdriver`."""
    kwargs: dict = {
        "headless": headless,
        "args": ["--disable-blink-features=AutomationControlled"],
        "ignore_default_args": ["--enable-automation"],
    }
    if _has_real_chrome():
        kwargs["channel"] = "chrome"
    else:
        executable_path = find_bundled_chromium()
        if executable_path:
            kwargs["executable_path"] = executable_path
    return kwargs


# Fallback Chrome version for a caller that needs the UA string before a
# browser is actually launched (e.g. browser_use.Browser, which takes
# user_agent as a construction-time profile field rather than something
# read off a live browser object afterwards, unlike raw Playwright). A
# stale-by-a-few-versions number here is a much weaker signal than the
# other fixes in this module (channel="chrome", webdriver hiding) — not
# worth the complexity of shelling out to detect the real installed
# version just for this.
_FALLBACK_CHROME_VERSION = "131.0.0.0"


def desktop_user_agent(version: str | None = None) -> str:
    """A normal desktop Chrome UA string — several sites (WhatsApp Web
    among them) reject or misbehave for Playwright's own default UA, which
    carries automation-identifying tokens in some configurations. Pass the
    launched browser's real `.version` when available (raw Playwright,
    post-launch); omit it to use a fixed recent fallback."""
    return (
        f"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
        f"(KHTML, like Gecko) Chrome/{version or _FALLBACK_CHROME_VERSION} Safari/537.36"
    )


# Hides navigator.webdriver (the primary automation tell), and patches two
# more cheap, well-known ones: an empty navigator.plugins/mimeTypes and a
# missing window.chrome runtime object, both common on a CDP-automated
# Chromium even with webdriver hidden. A real Chrome window (channel="chrome")
# already has these populated normally — this is mainly a safety net for the
# bundled-Chromium fallback path.
_STEALTH_INIT_SCRIPT = """
Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
if (!window.chrome) { window.chrome = { runtime: {} }; }
if (!navigator.plugins || navigator.plugins.length === 0) {
  Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
}
if (!navigator.mimeTypes || navigator.mimeTypes.length === 0) {
  Object.defineProperty(navigator, 'mimeTypes', { get: () => [1, 2, 3, 4] });
}
"""


async def apply_stealth(context) -> None:
    """Applies the shared init-script patch to a freshly created browser
    context — call this right after `browser.new_context(...)`, before
    navigating anywhere."""
    await context.add_init_script(_STEALTH_INIT_SCRIPT)
