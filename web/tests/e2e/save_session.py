"""Opens a browser to log in once with a real Supabase email code and saves
the session for smoke.py. The file stays local (web/tests/e2e/.auth is ignored).

  python web/tests/e2e/save_session.py [base_url]
"""

import os
import sys

from playwright.sync_api import sync_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else "https://dank-nine.vercel.app"
STATE = os.path.join(os.path.dirname(__file__), ".auth", "session.json")
os.makedirs(os.path.dirname(STATE), exist_ok=True)

with sync_playwright() as p:
    browser = p.chromium.launch(channel="chrome", headless=False)
    page = browser.new_page()
    page.goto(f"{BASE}/login")
    print("Log in in the opened window. Waiting for the Overview screen…")
    page.wait_for_url("**/overview", timeout=10 * 60 * 1000)
    page.context.storage_state(path=STATE)
    print(f"Session saved to {STATE}")
    browser.close()
