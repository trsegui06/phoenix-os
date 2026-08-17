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

test("completes the first Trade from zero prerequisites without operator intervention", async ({
  page,
}) => {
  const publicUser = {
    email: `phoenix-public-${Date.now()}@example.test`,
    password: "Phoenix-public-123!",
  };
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/register");
  await page.getByLabel("Email").fill(publicUser.email);
  await page.getByLabel("Password", { exact: true }).fill(publicUser.password);
  await page.getByLabel("Confirm password").fill(publicUser.password);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/onboarding$/);
  await page.getByLabel("Name").fill("Self-Service Trader");
  await page.getByLabel("Timezone").fill("Europe/Paris");
  await page.getByRole("button", { name: "Build my trading workspace" }).click();
  await expect(page).toHaveURL(/\/trading\/settings$/);
  await expect(page.getByRole("heading", { name: "Trading Setup", exact: true })).toBeVisible();

  const accounts = page.getByRole("region", { name: "Trading Accounts" });
  await accounts.getByText("Add Account").click();
  await accounts.getByLabel("Account Name").fill("Self-Service Account");
  await accounts.getByLabel("Broker").fill("Phoenix Broker");
  await accounts.getByLabel("Account Type").fill("cash");
  await accounts.getByLabel("Currency (3-letter code)").fill("EUR");
  await accounts.getByLabel("Initial Balance").fill("1000.00");
  await accounts.getByLabel("Status").fill("active");
  await accounts.getByRole("button", { name: "Create Trading Account" }).click();
  await expect(page.getByText("Trading Account created.")).toBeVisible();
  await expect(page.getByText("Self-Service Account", { exact: true })).toBeVisible();
  const accountCard = accounts.locator("article").filter({ hasText: "Self-Service Account" });
  await accountCard.getByText("Edit Account").click();
  await accountCard.getByLabel("Account Name").fill("Self-Service Account Updated");
  await accountCard.getByRole("button", { name: "Update Trading Account" }).click();
  await expect(page.getByText("Trading Account updated.")).toBeVisible();

  const sessions = page.getByRole("region", { name: "Trading Sessions" });
  await sessions.getByText("Add Session").click();
  await sessions.getByLabel("Session Date").fill("2026-08-17");
  await sessions.getByLabel("Session Type").fill("London");
  await sessions.getByRole("button", { name: "Create Session" }).click();
  await expect(page.getByText("Session created.")).toBeVisible();
  const sessionCard = sessions.locator("article").filter({ hasText: "London" });
  await sessionCard.getByText("Edit Session").click();
  await sessionCard.getByLabel("Session Type").fill("London Updated");
  await sessionCard.getByRole("button", { name: "Update Session" }).click();
  await expect(page.getByText("Session updated.")).toBeVisible();

  const setups = page.getByRole("region", { name: "Trading Setups" });
  await setups.getByText("Add Setup").click();
  await setups.getByLabel("Name").fill("Breakout");
  await setups.getByLabel("Timeframe").fill("5m");
  await setups.getByLabel("Entry Rules").fill("Break structure");
  await setups.getByLabel("Exit Rules").fill("Target or stop");
  await setups.getByLabel("Validation Rules").fill("Confirm volume");
  await setups.getByRole("button", { name: "Create Setup" }).click();
  await expect(page.getByText("Setup created.")).toBeVisible();
  const setupCard = setups.locator("article").filter({ hasText: "Breakout" });
  await setupCard.getByText("Edit Setup").click();
  await setupCard.getByLabel("Timeframe").fill("15m");
  await setupCard.getByRole("button", { name: "Update Setup" }).click();
  await expect(page.getByText("Setup updated.")).toBeVisible();

  await page.getByRole("link", { name: "Record a Trade" }).click();
  await expect(page).toHaveURL(/\/trading\/new$/);
  await expect(page.getByRole("combobox", { name: "Trading Account" })).toContainText(
    "Self-Service Account Updated",
  );
  await expect(page.getByRole("combobox", { name: "Session" })).toContainText("London Updated");
  await expect(page.getByRole("combobox", { name: "Setup" })).toContainText("Breakout — 15m");
  await page.getByLabel("Trade Date").fill("2026-08-17");
  await page.getByLabel("Asset").fill("EURUSD");
  await page.getByLabel("Entry Price").fill("1.1");
  await page.getByLabel("Stop Loss").fill("1.09");
  await page.getByLabel("Take Profit").fill("1.12");
  await page.getByLabel("Position Size").fill("1");
  await page.getByLabel("Risk (%)").fill("1");
  await page.getByLabel("Result").fill("win");
  await page.getByLabel(/Realized P&L/).fill("10.00");
  await page.getByRole("button", { name: "Record Trade" }).click();
  await expect(page).toHaveURL(/\/trading\?created=trade$/);
  await expect(page.getByText("Trade recorded.")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.getByRole("button", { name: "Logout" }).click();
  await signIn(page, publicUser);
  await expect(page).toHaveURL(/\/trading$/);
});

test("protects Trading, creates a session, logs out, and destroys the session", async ({
  page,
}) => {
  await page.goto("/trading");
  await expect(page).toHaveURL(/\/login$/);
  await page.goto("/trading/settings");
  await expect(page).toHaveURL(/\/login$/);
  await page.goto("/onboarding");
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

test("routes an authenticated user without a Trader to onboarding", async ({ page }) => {
  await page.goto("/login");
  await signIn(page, e2eMissingProfileUser);
  await expect(page).toHaveURL(/\/onboarding$/);
  await expect(page.getByRole("heading", { name: "Build your trading workspace." })).toBeVisible();
  await page.goto("/trading/settings");
  await expect(page).toHaveURL(/\/onboarding$/);
  await expect(page.getByText("Add Account")).toHaveCount(0);
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

test("rejects reset access without a verified recovery flow", async ({ page }) => {
  await page.goto("/reset-password");
  await expect(page.getByRole("alert")).toHaveText("This recovery link is invalid or has expired.");
  await expect(page.getByRole("link", { name: "Request a new reset email" })).toBeVisible();
});

test("recovers a password through the local email and rejects the old password", async ({
  page,
  request,
}) => {
  test.setTimeout(60_000);
  const newPassword = "Phoenix-recovered-456!";
  await page.goto("/forgot-password");
  await page.getByLabel("Email").fill(e2eUser.email);
  await page.getByRole("button", { name: "Send reset instructions" }).click();
  await expect(page.getByRole("status")).toContainText("If an account exists");

  const findRecoveryMessage = async () => {
    const response = await request.get("http://127.0.0.1:54324/api/v1/messages");
    const body = (await response.json()) as {
      messages?: Array<{ ID: string; To?: Array<{ Address?: string }> }>;
    };
    return body.messages?.find((message) =>
      message.To?.some((recipient) => recipient.Address === e2eUser.email),
    )?.ID;
  };
  await expect.poll(findRecoveryMessage).toBeTruthy();
  const messageId = await findRecoveryMessage();
  const message = await request.get(`http://127.0.0.1:54324/api/v1/message/${messageId}`);
  const body = (await message.json()) as { HTML?: string; Text?: string };
  const recoveryUrl = (body.HTML ?? body.Text ?? "")
    .replaceAll("&amp;", "&")
    .match(/https?:\/\/[^"'<>\s]+/)?.[0];
  expect(recoveryUrl).toBeTruthy();
  await page.goto(recoveryUrl!);
  await expect(page).toHaveURL(/\/reset-password\?recovery=authorized$/);
  const recoveryCookies = await page.context().cookies();
  const recoveryCookieNames = recoveryCookies.map((cookie) => cookie.name);
  expect(recoveryCookieNames).toContain("phoenix-recovery-authorized");
  expect(recoveryCookieNames).toContain("sb-127-auth-token");
  const currentHost = new URL(page.url()).hostname;
  expect(
    recoveryCookies
      .filter((cookie) =>
        ["phoenix-recovery-authorized", "sb-127-auth-token"].includes(cookie.name),
      )
      .map((cookie) => ({ name: cookie.name, domain: cookie.domain })),
  ).toEqual(
    expect.arrayContaining([
      { name: "phoenix-recovery-authorized", domain: currentHost },
      { name: "sb-127-auth-token", domain: currentHost },
    ]),
  );
  await page.getByLabel("New Password", { exact: true }).fill(newPassword);
  await page.getByLabel("Confirm new password").fill(newPassword);
  await page.getByRole("button", { name: "Update password" }).click();
  await expect(page).toHaveURL(/\/login\?reset=success$/);

  await signIn(page, e2eUser);
  await expect(page.locator('p[role="alert"]')).toHaveText("Email or password is incorrect.");
  await page.getByLabel("Email").fill(e2eUser.email);
  await page.getByLabel("Password").fill(newPassword);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/trading$/);
});
