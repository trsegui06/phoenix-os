import { expect, test } from "@playwright/test";

test("renders the Phoenix OS foundation page", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Phoenix OS" })).toBeVisible();
  await expect(page.getByText("L'application est initialisée")).toBeVisible();
});

test("renders the Trading Dashboard zero state", async ({ page }) => {
  await page.goto("/trading");

  await expect(page.getByRole("heading", { name: "Trading Dashboard" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Realized P&L by Currency" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Setup Performance" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Session Performance" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Asset Performance" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Trade Error Insights" })).toBeVisible();
  await expect(page.getByText("No trades recorded yet.")).toBeVisible();
});

test("keeps the Trading Dashboard usable across responsive viewports", async ({ page }) => {
  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 1024, height: 768 },
    { width: 768, height: 1024 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/trading");
    await expect(page.getByLabel("From")).toBeVisible();
    await expect(page.getByLabel("Trading account")).toBeVisible();
    await expect(page.getByRole("button", { name: "Apply" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Trade Error Insights" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      viewport.width,
    );
  }
});
