"""End-to-end smoke test of the investor app.

Login uses real Supabase email codes, so the signed-in part runs from a saved
browser session. Create it once (a browser opens; log in with your email):
  python web/tests/e2e/save_session.py

Then run from the repo root:
  python skills/webapp-testing/scripts/with_server.py \
    --server "cd web && exec npx next start -p 3123" --port 3123 \
    -- python web/tests/e2e/smoke.py
Without a saved session only the guest and login-form checks run.
"""

import os
import re
import sys

from playwright.sync_api import expect, sync_playwright

BASE = os.environ.get("BASE_URL", "http://localhost:3123")
STATE = os.path.join(os.path.dirname(__file__), ".auth", "session.json")
OUT = os.path.join(os.path.dirname(__file__), "..", "screenshots")
os.makedirs(OUT, exist_ok=True)
errors: list[str] = []


def shot(page, name):
    page.screenshot(path=os.path.join(OUT, f"{name}.png"), full_page=True)


def no_horizontal_scroll(page, where):
    width = page.evaluate("document.documentElement.scrollWidth")
    assert width <= 390, f"{where}: horizontal scroll ({width}px)"


with sync_playwright() as p:
    browser = p.chromium.launch(channel="chrome", headless=True)

    # Guests are sent to /login.
    guest = browser.new_page()
    guest.goto(f"{BASE}/overview")
    expect(guest).to_have_url(re.compile(r"/login$"))
    guest.close()

    # Login form validates before contacting Supabase.
    login = browser.new_page(viewport={"width": 390, "height": 844})
    login.goto(BASE)
    shot(login, "01-welcome")
    login.get_by_role("link", name="Log in").click()
    expect(login).to_have_url(re.compile(r"/login$"))
    login.get_by_label("Email").fill("not-an-email")
    login.get_by_role("button", name="Send code").click()
    expect(login.get_by_text("Enter a valid email address.")).to_be_visible()
    shot(login, "02-login")
    login.close()

    if not os.path.exists(STATE):
        print("No saved session: skipped signed-in checks (run save_session.py).")
        browser.close()
        sys.exit(0)

    ctx = browser.new_context(
        storage_state=STATE,
        viewport={"width": 390, "height": 844},
        device_scale_factor=2,
        is_mobile=True,
        has_touch=True,
    )
    page = ctx.new_page()
    page.on("console", lambda m: errors.append(m.text) if m.type == "error" and "tradingview" not in m.text.lower() else None)
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.goto(BASE)
    expect(page).to_have_url(re.compile(r"/overview$"))

    # Overview: capital, summary, tickers.
    expect(page.get_by_text("$89,384.16").first).to_be_visible()
    expect(page.get_by_text("Interest received")).to_be_visible()
    expect(page.locator("iframe[src*='tradingview']")).to_have_count(2, timeout=15000)
    page.wait_for_timeout(2500)
    no_horizontal_scroll(page, "overview")
    shot(page, "03-overview")

    page.get_by_role("button", name="What is compound interest?").click()
    expect(page.get_by_role("heading", name="Compound interest")).to_be_visible()
    page.get_by_role("button", name="Close").click()

    # Operations with filter.
    page.get_by_role("navigation", name="Main").get_by_role("link", name="Operations").click()
    expect(page).to_have_url(re.compile(r"/operations$"))
    page.get_by_role("radio", name="Withdrawals").click()
    expect(page.locator("section li:visible", has_text="Withdrawal")).to_have_count(2)
    page.get_by_role("radio", name="All").click()
    no_horizontal_scroll(page, "operations")
    shot(page, "04-operations")

    # Withdraw: validation, wire transfer, code confirmation.
    page.get_by_role("navigation", name="Main").get_by_role("link", name="Withdraw").click()
    page.get_by_role("button", name="Continue").click()
    expect(page.get_by_text("Enter an amount above zero.")).to_be_visible()
    page.get_by_label("Amount, USD").fill("2500")
    shot(page, "05-withdraw-amount")
    page.get_by_role("button", name="Continue").click()
    page.get_by_role("button", name="Continue").click()
    expect(page.get_by_text("Enter the bank name.")).to_be_visible()
    page.get_by_label("Bank name").fill("Chase")
    page.get_by_label("Account holder name").fill("Test Investor")
    page.get_by_label("Account number").fill("000123456789")
    page.get_by_label("SWIFT code").fill("CHASUS33")
    shot(page, "06-withdraw-details")
    page.get_by_role("button", name="Continue").click()
    expect(page.get_by_text("•••• 6789")).to_be_visible()
    page.get_by_label("The amount and payout details are correct.").check()
    expect(page.get_by_role("button", name="Email me a code")).to_be_enabled()
    shot(page, "07-withdraw-review")

    # Statement.
    page.goto(f"{BASE}/statement")
    expect(page.get_by_text("Account statement")).to_be_visible()
    no_horizontal_scroll(page, "statement")
    shot(page, "09-statement")

    # Settings: request change, light theme, log out.
    page.goto(f"{BASE}/settings")
    page.get_by_label("Phone").fill("+52 624 555 0100")
    page.get_by_role("button", name="Request change").click()
    expect(page.get_by_text("Request sent. We'll update your details")).to_be_visible()
    page.get_by_role("radio", name="Light").click()
    expect(page.locator("html")).to_have_attribute("data-theme", "light")
    shot(page, "10-settings-light")
    page.goto(f"{BASE}/overview")
    expect(page.locator("html")).to_have_attribute("data-theme", "light")
    page.wait_for_timeout(2500)
    shot(page, "11-overview-light")
    page.goto(f"{BASE}/settings")
    page.get_by_role("radio", name="Dark").click()

    expect(page.get_by_role("button", name="Log out")).to_be_visible()

    browser.close()

if errors:
    print("Console errors:", *errors, sep="\n  ")
    sys.exit(1)
print("Smoke test passed")
