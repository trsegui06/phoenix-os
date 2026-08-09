import { expect, test } from "@playwright/test";

test("renders the Phoenix OS foundation page", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Phoenix OS" })).toBeVisible();
  await expect(page.getByText("L'application est initialisée")).toBeVisible();
});
