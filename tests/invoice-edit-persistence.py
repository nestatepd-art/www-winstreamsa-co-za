"""
Regression test: edit an invoice, refresh, verify all fields persist.

Run: python3 tests/invoice-edit-persistence.py [invoice_id]

Requires the LOVABLE_BROWSER_SUPABASE_* env vars to be present (auto-injected
in the Lovable sandbox once the user has signed into the preview).
"""
import asyncio, json, os, sys, time
from pathlib import Path
from playwright.async_api import async_playwright, expect

BASE = "http://localhost:8080"
INVOICE_ID = sys.argv[1] if len(sys.argv) > 1 else "f3934f3d-5c98-4aa2-8bde-9fa7fb5bd5c5"
SHOTS = Path(__file__).parent.parent / "tmp" / "browser" / "invoice-edit-regression"
SHOTS.mkdir(parents=True, exist_ok=True)

# Unique values per run so we know persistence is real, not stale cache.
STAMP = str(int(time.time()))
EXPECTED = {
    "title":          f"Regression Title {STAMP}",
    "invoiceNumber":  f"REG-{STAMP}",
    "notes":          f"Regression notes {STAMP}",
    "terms":          f"Net 30 — regression {STAMP}",
    "issueDate":      "2026-01-15",
    "dueDate":        "2026-02-15",
    "vatRate":        "12",
    "business_name":  f"Regression Co {STAMP}",
    "city":           f"Cape Town {STAMP}",
    "phone":          f"+27-555-{STAMP[-4:]}",
    "item_desc":      f"Regression line item {STAMP}",
    "item_qty":       "3",
    "item_price":     "199.50",
}


async def restore_session(page):
    key = os.environ["LOVABLE_BROWSER_SUPABASE_STORAGE_KEY"]
    sess = os.environ["LOVABLE_BROWSER_SUPABASE_SESSION_JSON"]
    await page.goto(BASE, wait_until="domcontentloaded")
    await page.evaluate(
        f"window.localStorage.setItem({json.dumps(key)}, {json.dumps(sess)})"
    )


async def fill_input_by_label(page, label, value):
    el = page.get_by_label(label, exact=True).first
    await el.fill("")
    await el.fill(value)


async def read_input_by_label(page, label):
    el = page.get_by_label(label, exact=True).first
    return await el.input_value()


async def goto_edit(page):
    await page.goto(f"{BASE}/invoices/{INVOICE_ID}/edit", wait_until="networkidle")
    await page.wait_for_selector('text=Edit invoice', timeout=10000)
    # Wait for company fields to populate (loaded flag flipped)
    await page.wait_for_function(
        "() => Array.from(document.querySelectorAll('label')).some(l => l.textContent === 'Business name')",
        timeout=10000,
    )


async def main():
    failures = []
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        ctx = await browser.new_context(viewport={"width": 1280, "height": 1800})
        page = await ctx.new_page()

        await restore_session(page)
        await goto_edit(page)
        await page.screenshot(path=str(SHOTS / "1_loaded.png"))

        # --- Edit fields ---
        await fill_input_by_label(page, "Invoice number", EXPECTED["invoiceNumber"])
        await fill_input_by_label(page, "Title", EXPECTED["title"])
        await fill_input_by_label(page, "VAT rate (%)", EXPECTED["vatRate"])
        await fill_input_by_label(page, "Issue date", EXPECTED["issueDate"])
        await fill_input_by_label(page, "Due date", EXPECTED["dueDate"])
        await fill_input_by_label(page, "Business name", EXPECTED["business_name"])
        await fill_input_by_label(page, "City", EXPECTED["city"])
        await fill_input_by_label(page, "Phone", EXPECTED["phone"])
        await fill_input_by_label(page, "Notes (shown on the invoice)", EXPECTED["notes"])
        await fill_input_by_label(page, "Terms", EXPECTED["terms"])

        # First line item description (Textarea, not a labeled input)
        desc = page.locator('textarea[placeholder="Description"]').first
        await desc.fill(EXPECTED["item_desc"])
        # Quantity + price inputs sit next to it in the same row
        row = desc.locator("xpath=ancestor::div[contains(@class,'grid-cols-12')][1]")
        qty = row.locator('input[type="number"]').nth(0)
        price = row.locator('input[type="number"]').nth(1)
        await qty.fill(EXPECTED["item_qty"])
        await price.fill(EXPECTED["item_price"])

        await page.screenshot(path=str(SHOTS / "2_edited.png"))

        # --- Save ---
        await page.get_by_role("button", name="Save changes").first.click()
        # Mutation navigates to invoice detail on success
        await page.wait_for_url(f"{BASE}/invoices/{INVOICE_ID}", timeout=15000)
        await page.screenshot(path=str(SHOTS / "3_after_save.png"))

        # --- Hard refresh, return to edit page ---
        await goto_edit(page)
        await page.screenshot(path=str(SHOTS / "4_after_refresh.png"))

        # --- Verify each field ---
        checks = [
            ("Invoice number",                EXPECTED["invoiceNumber"]),
            ("Title",                         EXPECTED["title"]),
            ("VAT rate (%)",                  EXPECTED["vatRate"]),
            ("Issue date",                    EXPECTED["issueDate"]),
            ("Due date",                      EXPECTED["dueDate"]),
            ("Business name",                 EXPECTED["business_name"]),
            ("City",                          EXPECTED["city"]),
            ("Phone",                         EXPECTED["phone"]),
            ("Notes (shown on the invoice)",  EXPECTED["notes"]),
            ("Terms",                         EXPECTED["terms"]),
        ]
        for label, want in checks:
            got = await read_input_by_label(page, label)
            ok = got == want
            print(f"  [{'OK' if ok else 'FAIL'}] {label}: want={want!r} got={got!r}")
            if not ok:
                failures.append((label, want, got))

        # Line item checks
        got_desc = await page.locator('textarea[placeholder="Description"]').first.input_value()
        if got_desc != EXPECTED["item_desc"]:
            failures.append(("line item description", EXPECTED["item_desc"], got_desc))
            print(f"  [FAIL] line item description: want={EXPECTED['item_desc']!r} got={got_desc!r}")
        else:
            print(f"  [OK] line item description")

        row = page.locator('textarea[placeholder="Description"]').first.locator(
            "xpath=ancestor::div[contains(@class,'grid-cols-12')][1]"
        )
        got_qty = await row.locator('input[type="number"]').nth(0).input_value()
        got_price = await row.locator('input[type="number"]').nth(1).input_value()
        for name, want, got in [
            ("line item qty",   EXPECTED["item_qty"],   got_qty),
            ("line item price", EXPECTED["item_price"], got_price),
        ]:
            if float(got) != float(want):
                failures.append((name, want, got))
                print(f"  [FAIL] {name}: want={want!r} got={got!r}")
            else:
                print(f"  [OK] {name}")

        await browser.close()

    print()
    if failures:
        print(f"REGRESSION FAILED — {len(failures)} field(s) did not persist:")
        for label, want, got in failures:
            print(f"  - {label}: expected {want!r}, got {got!r}")
        sys.exit(1)
    print("REGRESSION PASSED — all invoice fields persisted after refresh.")


if __name__ == "__main__":
    asyncio.run(main())
