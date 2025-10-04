from playwright.sync_api import sync_playwright, expect
import re

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page()
    page.goto("http://localhost:9002")

    # Select an invalid date
    page.get_by_role("combobox", name=re.compile("month", re.IGNORECASE)).click()
    page.get_by_role("option", name="February").click()

    page.get_by_role("combobox", name=re.compile("day", re.IGNORECASE)).click()
    page.get_by_role("option", name="30").click()

    page.get_by_role("combobox", name=re.compile("year", re.IGNORECASE)).click()
    page.get_by_role("option", name="2000").click()

    # Click the submit button
    page.get_by_role("button", name=re.compile("enter", re.IGNORECASE)).click()

    # Wait for the error message to appear
    error_message = page.locator('[data-testid="form-error"]')
    expect(error_message).to_be_visible()
    expect(error_message).to_have_text("Please enter a valid date.")

    # Take a screenshot
    page.screenshot(path="jules-scratch/verification/verification.png")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)