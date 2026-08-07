import asyncio
import glob
import os
import time
import traceback
import uuid
from playwright.async_api import async_playwright
from app.services.vault import save_app_credentials

SESSION_TTL_SECONDS = 10 * 60  # abandon a session nobody has captured/cancelled in 10 minutes

# In-memory registry of in-flight "log in in a real browser window" sessions
# — see whatsapp_engine.py's _sessions for the pattern this mirrors. Each
# entry owns a real HEADED (visible) browser window the user interacts with
# directly: they log in exactly as they normally would (typing their real
# password, solving any CAPTCHA/2FA themselves), which is indistinguishable
# from ordinary human browsing to the target site — no automation signal at
# all during login, unlike driving the login form via an LLM agent. Once the
# user confirms they're done, capture_browser_login_session reads the
# resulting cookies straight out of the browser and stores them the exact
# same way execute_browser_action already knows how to consume them.
_sessions: dict[str, dict] = {}


def _find_local_chromium() -> str | None:
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


async def _cleanup_session(session_id: str) -> None:
    session = _sessions.pop(session_id, None)
    if not session:
        return
    try:
        await session["browser"].close()
    except Exception:
        traceback.print_exc()
    finally:
        try:
            await session["playwright"].stop()
        except Exception:
            traceback.print_exc()


async def _sweep_expired_sessions() -> None:
    now = time.time()
    expired = [sid for sid, s in _sessions.items() if now - s["created_at"] > SESSION_TTL_SECONDS]
    for sid in expired:
        await _cleanup_session(sid)


async def start_browser_login_session(user_id: str, app_name: str, login_url: str | None) -> dict:
    """Opens a real, visible Chromium window (headless=False) — nothing is
    driven automatically here; the user takes over from this point and logs
    in themselves. Returns immediately so the caller can show a "waiting on
    you" state while the window stays open on the user's own screen."""
    await _sweep_expired_sessions()

    playwright = await async_playwright().start()
    launch_kwargs = {"headless": False}
    executable_path = _find_local_chromium()
    if executable_path:
        launch_kwargs["executable_path"] = executable_path

    try:
        browser = await playwright.chromium.launch(**launch_kwargs)
        context = await browser.new_context(viewport=None)
        page = await context.new_page()
        if login_url:
            try:
                await page.goto(login_url, wait_until="domcontentloaded", timeout=30000)
            except Exception:
                # Even a slow/unreachable login URL shouldn't block the
                # window from opening — the user can still navigate there
                # themselves once it's up.
                traceback.print_exc()

        session_id = str(uuid.uuid4())

        def _on_disconnected():
            # The user closed the window directly instead of clicking
            # Done/Cancel in the UI — still clean up instead of leaking the
            # in-memory session entry and its now-orphaned playwright driver
            # connection. The browser process itself is already gone by the
            # time this fires, so only stop() the driver, not close() it.
            session = _sessions.pop(session_id, None)
            if session:
                asyncio.create_task(session["playwright"].stop())

        browser.on("disconnected", lambda: _on_disconnected())

        _sessions[session_id] = {
            "playwright": playwright,
            "browser": browser,
            "context": context,
            "user_id": user_id,
            "app_name": app_name,
            "created_at": time.time(),
        }

        return {"session_id": session_id, "status": "waiting"}
    except Exception:
        try:
            await playwright.stop()
        except Exception:
            pass
        raise


async def capture_browser_login_session(session_id: str) -> dict:
    """Called once the user says they've finished logging in. Reads the
    browser's current cookie jar and hands it to save_app_credentials in
    exactly the shape execute_browser_action already reads back out (see
    browser_engine.py: any credential with a "cookies" key is passed
    straight into Playwright's storage_state) — no new storage format, no
    changes needed on the execution side."""
    session = _sessions.get(session_id)
    if not session:
        return {"status": "error", "error": "This login session has expired or was already completed — try connecting again."}

    try:
        storage_state = await session["context"].storage_state()
    except Exception as e:
        traceback.print_exc()
        await _cleanup_session(session_id)
        return {"status": "error", "error": f"Lost connection to the browser window: {e}"}

    if not storage_state.get("cookies"):
        # Don't cleanup — let the user go back and actually log in, then
        # click Done again, instead of forcing them to restart the whole
        # flow over a window that's still open and usable.
        return {"status": "error", "error": "No cookies were found yet — make sure you're fully logged in, then click Done again."}

    try:
        save_app_credentials(session["user_id"], session["app_name"], "session_cookie", storage_state)
    except Exception as e:
        traceback.print_exc()
        await _cleanup_session(session_id)
        return {"status": "error", "error": f"Logged in successfully, but failed to save the session: {e}"}

    await _cleanup_session(session_id)
    return {"status": "success", "cookie_count": len(storage_state.get("cookies") or [])}


async def cancel_browser_login_session(session_id: str) -> None:
    await _cleanup_session(session_id)
