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
  test.setTimeout(60_000);
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
  await expect(
    page.getByRole("heading", { name: "Build your trading operating system" }),
  ).toBeVisible();
  await page.getByLabel("Workspace name").fill("Self-Service Trader");
  await page.getByLabel("Timezone").fill("Europe/Paris");
  await page.getByRole("button", { name: "Set Up My Trading Environment" }).click();
  await expect(page.getByRole("heading", { name: "Add your first Trading Account" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Add your first Trading Account" })).toBeVisible();
  await page.getByLabel("Account Name").fill("Self-Service Account");
  await page.getByLabel("Broker").fill("Phoenix Broker");
  await page.getByLabel("Account Type").fill("cash");
  await page.getByLabel("Currency (3-letter code)").fill("EUR");
  await page.getByLabel("Initial Balance").fill("1000.00");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(
    page.getByRole("heading", { name: "Configure your trading environment" }),
  ).toBeVisible();
  await page.reload();
  await page.getByLabel("Session Date").fill("2026-08-17");
  await page.getByLabel("Session Type").fill("London Updated");
  await page.getByLabel("Name").fill("Breakout");
  await page.getByLabel("Timeframe").fill("15m");
  await page.getByLabel("Entry Rules").fill("Break structure");
  await page.getByLabel("Exit Rules").fill("Target or stop");
  await page.getByLabel("Validation Rules").fill("Confirm volume");
  await page.getByRole("button", { name: "Finish Setup" }).click();
  await expect(
    page.getByRole("heading", { name: "Your trading environment is ready" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Go to Dashboard" }).click();
  await page.getByRole("link", { name: "Trade", exact: true }).click();
  await expect(page).toHaveURL(/\/trading\/new$/);
  await expect(page.getByRole("combobox", { name: "Trading Account" })).toContainText(
    "Self-Service Account",
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
  await page.goto("/onboarding");
  await expect(
    page.getByRole("heading", { name: "Your trading environment is ready" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Go to Dashboard" }).click();
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

test("navigates the Trading shell and preserves mobile access", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/login");
  await signIn(page);
  await expect(page).toHaveURL(/\/trading$/);

  const navigation = page.getByRole("navigation", { name: "Mobile trading navigation" });
  await expect(navigation).toBeVisible();
  const dashboard = navigation.getByRole("link", { name: "Dashboard" });
  const trade = navigation.getByRole("link", { name: "Trade" });
  const reviews = navigation.getByRole("link", { name: "Reviews" });
  const setup = navigation.getByRole("link", { name: "Setup" });

  await expect(dashboard).toHaveAttribute("aria-current", "page");
  await trade.click();
  await expect(page).toHaveURL(/\/trading\/new$/);
  await expect(trade).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("heading", { name: "New Trade" })).toBeVisible();

  await reviews.click();
  await expect(page).toHaveURL(/\/trading\/reviews$/);
  await expect(reviews).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("heading", { name: "Trading Reviews" })).toBeVisible();

  await setup.click();
  await expect(page).toHaveURL(/\/trading\/settings$/);
  await expect(setup).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("heading", { name: "Trading Setup", exact: true })).toBeVisible();
  await dashboard.press("Enter");
  await expect(page).toHaveURL(/\/trading$/);
  await expect(dashboard).toHaveAttribute("aria-current", "page");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);

  await page.getByRole("button", { name: "Logout" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto("/trading/reviews");
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
  await expect(
    page.getByRole("heading", { name: "Build your trading operating system" }),
  ).toBeVisible();
  await page.goto("/trading/settings");
  await expect(page).toHaveURL(/\/onboarding$/);
  await expect(page.getByText("Add Account")).toHaveCount(0);
});

test("keeps onboarding skip behavior deterministic without creating prerequisites", async ({
  page,
}) => {
  const user = {
    email: `phoenix-onboarding-skip-${Date.now()}@example.test`,
    password: "Phoenix-skip-123!",
  };
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto("/register");
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Password", { exact: true }).fill(user.password);
  await page.getByLabel("Confirm password").fill(user.password);
  await page.getByRole("button", { name: "Create account" }).click();
  await page.getByLabel("Workspace name").fill("Skip Flow Trader");
  await page.getByRole("button", { name: "Set Up My Trading Environment" }).click();
  await page.getByRole("link", { name: "Skip for now" }).click();
  await expect(page).toHaveURL(/\/onboarding\?step=environment$/);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Configure your trading environment" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Skip for now" }).click();
  await expect(
    page.getByRole("heading", { name: "Your trading environment is ready" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Go to Dashboard" }).click();
  await page.getByRole("link", { name: "New Trade" }).click();
  await expect(page.getByText(/Create a Trading Account, a Session, a Setup/)).toBeVisible();
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

test("completes the Review learning loop on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/login");
  await signIn(page, { email: e2eUser.email, password: "Phoenix-recovered-456!" });
  await expect(page).toHaveURL(/\/trading$/);

  await page.getByRole("link", { name: "Reviews", exact: true }).click();
  await expect(page).toHaveURL(/\/trading\/reviews$/);
  await expect(page.getByRole("heading", { name: "Trading Reviews" })).toBeVisible();
  await page.getByRole("link", { name: "New Review", exact: true }).click();

  await page.getByLabel("Review type").fill("Weekly process review");
  await page.getByLabel("Period start").fill("2026-08-01");
  await page.getByLabel("Period end").fill("2026-08-31");
  await page.getByLabel("Review summary").fill("Execution stayed deliberate.");
  await page.getByLabel("What worked").fill("Waited for the planned setup.");
  await page.getByLabel("What needs work").fill("Reduce hesitation after confirmation.");
  await page.getByLabel("Next actions").fill("Use the pre-session checklist.");
  const tradeChoices = page.getByRole("checkbox", { name: /EURUSD/ });
  if (await tradeChoices.count()) await tradeChoices.first().check();
  await page.getByRole("button", { name: "Create Review" }).click();

  await expect(page).toHaveURL(/\/trading\/reviews\/[0-9a-f-]+\?created=1$/);
  await expect(page.getByRole("status")).toHaveText("Review created successfully.");
  await expect(page.getByRole("heading", { name: "2026-08-01 → 2026-08-31" })).toBeVisible();
  await page.getByRole("link", { name: "Edit Review" }).click();
  await page.getByLabel("Next actions").fill("Use the checklist and record one observation.");
  await page.getByRole("button", { name: "Save Review" }).click();

  await expect(page).toHaveURL(/\/trading\/reviews\/[0-9a-f-]+\?updated=1$/);
  await expect(page.getByRole("status")).toHaveText("Review updated successfully.");
  await expect(page.getByText("Use the checklist and record one observation.")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const reviewPath = new URL(page.url()).pathname;
  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 1024, height: 768 },
    { width: 768, height: 1024 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    for (const path of [
      "/trading/reviews",
      "/trading/reviews/new",
      reviewPath,
      `${reviewPath}/edit`,
    ]) {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
        viewport.width,
      );
    }
  }
  await page.goto(reviewPath);
  await page.getByRole("link", { name: "Back to Reviews" }).click();
  await page
    .getByRole("navigation", { name: "Mobile trading navigation" })
    .getByRole("link", { name: "Dashboard" })
    .press("Enter");
  await expect(page).toHaveURL(/\/trading$/);
});
