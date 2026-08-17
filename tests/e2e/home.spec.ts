import { expect, test } from "@playwright/test";

import { e2eMissingProfileUser, e2eUser } from "./auth-fixture";

test.describe.configure({ mode: "serial" });

async function signIn(
  page: import("@playwright/test").Page,
  credentials: { email: string; password: string } = e2eUser,
) {
  await page.getByLabel("Email").fill(credentials.email);
  await page.getByLabel("Password").fill(credentials.password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

test("renders the Phoenix OS foundation page", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Phoenix OS" })).toBeVisible();
});

test("protects Trading, creates a session, logs out, and destroys the session", async ({
  page,
}) => {
  await page.goto("/trading");
  await expect(page).toHaveURL(/\/login$/);

  await signIn(page);
  await expect(page).toHaveURL(/\/trading$/);
  await expect(page.getByRole("heading", { name: "Trading Dashboard" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Realized P&L by Currency" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Setup Performance" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Session Performance" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Asset Performance" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Trade Error Insights" })).toBeVisible();

  await page.getByRole("button", { name: "Logout" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto("/trading");
  await expect(page).toHaveURL(/\/login$/);
});

test("shows a generic error for invalid credentials", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("missing@example.test");
  await page.getByLabel("Password").fill("incorrect-password");
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.locator('p[role="alert"]')).toHaveText("Email or password is incorrect.");
  await expect(page.getByText(/invalid login credentials/i)).toHaveCount(0);
});

test("records a Trade with multiple errors and refreshes the dashboard", async ({ page }) => {
  await page.goto("/login");
  await signIn(page);
  await page.getByRole("link", { name: "New Trade" }).click();
  await expect(page.getByRole("heading", { name: "New Trade" })).toBeVisible();
  await page.getByLabel("Trade Date").fill("2026-08-17");
  await page.getByLabel("Asset").fill("EURUSD");
  await page.getByLabel("Entry Price").fill("1.1");
  await page.getByLabel("Stop Loss").fill("1.09");
  await page.getByLabel("Take Profit").fill("1.12");
  await page.getByLabel("Position Size").fill("2");
  await page.getByLabel("Risk (%)").fill("1.25");
  await page.getByLabel("Result").fill("win");
  await page.getByLabel(/Realized P&L/).fill("125.50");
  for (const [category, severity, description] of [
    ["process", "low", "Late entry"],
    ["risk", "medium", "Wide stop"],
  ]) {
    await page.getByRole("button", { name: "Add Error" }).click();
    const row = page.locator("fieldset").last().locator("div.rounded-xl").last();
    await row.getByLabel("Category").fill(category);
    await row.getByLabel("Severity").fill(severity);
    await row.getByLabel("Description").fill(description);
  }
  await page.getByRole("button", { name: "Record Trade" }).click();
  await expect(page).toHaveURL(/\/trading\?created=trade$/);
  await expect(page.getByText("Trade recorded.")).toBeVisible();
});

test("redirects an authenticated user away from Login", async ({ page }) => {
  await page.goto("/login");
  await signIn(page);
  await expect(page).toHaveURL(/\/trading$/);
  await page.goto("/login");
  await expect(page).toHaveURL(/\/trading$/);
});

test("shows a controlled state for a missing Trader profile", async ({ page }) => {
  await page.goto("/login");
  await signIn(page, e2eMissingProfileUser);
  await expect(page).toHaveURL(/\/trading$/);
  await expect(
    page.getByText("Your account is signed in, but your trading workspace is not configured yet."),
  ).toBeVisible();
});

test("keeps Login and authenticated Trading usable at required viewports", async ({ page }) => {
  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 1024, height: 768 },
    { width: 768, height: 1024 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "Discipline before profit." })).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      viewport.width,
    );
  }

  await signIn(page);
  await expect(page).toHaveURL(/\/trading$/);
  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 1024, height: 768 },
    { width: 768, height: 1024 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/trading");
    await expect(page.getByRole("heading", { name: "Trading Dashboard" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Logout" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      viewport.width,
    );
  }
});
