import { expect, test } from "@playwright/test";

import { e2eMissingProfileUser, e2eUser } from "./auth-fixture";

test.describe.configure({ mode: "serial" });

const requiredViewports = [
  { width: 1440, height: 900 },
  { width: 1024, height: 768 },
  { width: 768, height: 1024 },
  { width: 390, height: 844 },
] as const;

async function expectNoHorizontalOverflow(page: import("@playwright/test").Page, width: number) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    width,
  );
}

async function signIn(
  page: import("@playwright/test").Page,
  credentials: { email: string; password: string } = e2eUser,
) {
  await page.getByLabel("Email").fill(credentials.email);
  await page.getByLabel("Password").fill(credentials.password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

function csvFor(ticket: string, openedAt: string) {
  return [
    "Broker,Compte ID,Ticket,Heure d'ouverture,Heure de fermeture,Prix de fermeture,Symbole,Type,Lots,Prix d'entrée,Stop Loss,Take Profit,Commentaire,Profit net",
    `RaiseGlobal-Live,E2E-SOURCE,${ticket},${openedAt}T08:00:00Z,${openedAt}T08:20:00Z,"2405,00",Gold,Buy,"0,01","2400,00","2390,00","2410,00",AURUM TP1,"10,00 €"`,
  ].join("\n");
}

test("routes an unauthenticated application launch to Login", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "Discipline before profit." })).toBeVisible();
});

test("resolves a supported browser language before authentication", async ({ browser }) => {
  const context = await browser.newContext({ locale: "fr-FR" });
  const page = await context.newPage();
  await page.goto("/login");
  await expect(page.locator("html")).toHaveAttribute("lang", "fr");
  await expect(page.getByRole("heading", { name: "La discipline avant le profit." })).toBeVisible();
  await expect(page.getByRole("button", { name: "Se connecter" })).toBeVisible();
  await page.goto("/register");
  await expect(page.getByRole("heading", { name: "Créez votre espace de trading." })).toBeVisible();
  await page.getByRole("button", { name: "Créer un compte" }).click();
  await expect(page.locator('p[role="alert"]')).toHaveText("Vérifiez les champs signalés.");
  await page.goto("/forgot-password");
  await expect(page.getByRole("heading", { name: "Récupérez votre accès Phoenix." })).toBeVisible();
  await page.goto("/reset-password");
  await expect(
    page.getByRole("heading", { name: "Choisissez un nouveau mot de passe." }),
  ).toBeVisible();
  for (const viewport of requiredViewports) {
    await page.setViewportSize(viewport);
    await page.goto("/login");
    await expectNoHorizontalOverflow(page, viewport.width);
  }
  await context.close();

  const spanishContext = await browser.newContext({ locale: "es-ES" });
  const spanishPage = await spanishContext.newPage();
  await spanishPage.goto("/login");
  await expect(spanishPage.locator("html")).toHaveAttribute("lang", "es");
  await expect(
    spanishPage.getByRole("heading", { name: "Disciplina antes que beneficio." }),
  ).toBeVisible();
  for (const viewport of requiredViewports) {
    await spanishPage.setViewportSize(viewport);
    await spanishPage.goto("/register");
    await expectNoHorizontalOverflow(spanishPage, viewport.width);
  }
  await spanishContext.close();
});

test("persists the authenticated Trader language across sessions", async ({ page, browser }) => {
  await page.goto("/login");
  await signIn(page, e2eUser);
  await expect(page).toHaveURL(/\/trading$/);
  await page.goto("/trading/settings");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByRole("heading", { name: "Language" })).toBeVisible();

  await page.getByLabel("Application language").selectOption("fr");
  await expect(page.locator("html")).toHaveAttribute("lang", "fr");
  await expect(page.getByRole("heading", { name: "Langue" })).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Navigation principale du trading" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Tableau de bord" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Déconnexion" })).toBeVisible();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "fr");

  await page.getByLabel("Langue de l’application").selectOption("es");
  await expect(page.locator("html")).toHaveAttribute("lang", "es");
  await expect(page.getByRole("heading", { name: "Idioma" })).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Navegación principal de trading" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Nueva operación" })).toBeVisible();

  const secondContext = await browser.newContext({ locale: "en-US" });
  const secondPage = await secondContext.newPage();
  await secondPage.goto("/login");
  await signIn(secondPage, e2eUser);
  await expect(secondPage).toHaveURL(/\/trading$/);
  await secondPage.goto("/trading/settings");
  await expect(secondPage.locator("html")).toHaveAttribute("lang", "es");
  await expect(secondPage.getByRole("heading", { name: "Idioma" })).toBeVisible();
  await secondPage.getByLabel("Idioma de la aplicación").selectOption("en");
  await expect(secondPage.locator("html")).toHaveAttribute("lang", "en");
  await secondContext.close();
});

test("publishes installable PWA metadata without registering a service worker", async ({
  page,
  request,
}) => {
  const manifestResponse = await request.get("/manifest.webmanifest");
  expect(manifestResponse.ok()).toBe(true);
  expect(manifestResponse.headers()["content-type"]).toMatch(/^application\/manifest\+json\b/);

  const manifest = (await manifestResponse.json()) as {
    id: string;
    name: string;
    short_name: string;
    description: string;
    start_url: string;
    scope: string;
    display: string;
    background_color: string;
    theme_color: string;
    icons: Array<{ src: string; sizes: string; type: string; purpose: string }>;
  };
  expect(manifest).toMatchObject({
    id: "/",
    name: "Phoenix OS",
    short_name: "Phoenix OS",
    description: "Personal operating system for disciplined capital management.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#0f172a",
    theme_color: "#0f172a",
    icons: [
      {
        src: "/brand/app-icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/brand/app-icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  });

  for (const icon of manifest.icons) {
    const response = await request.get(icon.src);
    expect(response.ok()).toBe(true);
    expect(response.headers()["content-type"]).toMatch(/^image\/png\b/);
    const png = await response.body();
    const [width, height] = icon.sizes.split("x").map(Number);
    expect(png.readUInt32BE(16)).toBe(width);
    expect(png.readUInt32BE(20)).toBe(height);
  }

  await page.goto(manifest.start_url);
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "Discipline before profit." })).toBeVisible();
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute(
    "href",
    "/manifest.webmanifest",
  );
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", "#0f172a");
  await expect(page.locator('meta[name="mobile-web-app-capable"]')).toHaveAttribute(
    "content",
    "yes",
  );
  await expect(page.locator('meta[name="apple-mobile-web-app-title"]')).toHaveAttribute(
    "content",
    "Phoenix OS",
  );
  await expect(page.locator('meta[name="apple-mobile-web-app-status-bar-style"]')).toHaveAttribute(
    "content",
    "black",
  );
  await expect(page.locator('link[rel="icon"][sizes="16x16"]')).toHaveAttribute(
    "href",
    "/brand/favicon-16x16.png",
  );
  await expect(page.locator('link[rel="icon"][sizes="32x32"]')).toHaveAttribute(
    "href",
    "/brand/favicon-32x32.png",
  );
  await expect(page.locator('link[rel="icon"][sizes="48x48"][type="image/png"]')).toHaveAttribute(
    "href",
    "/brand/favicon-48x48.png",
  );
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute(
    "href",
    "/brand/apple-touch-icon.png",
  );
  expect(
    await page.evaluate(
      async () => (await navigator.serviceWorker?.getRegistrations())?.length ?? 0,
    ),
  ).toBe(0);
});

test("associates public Auth validation errors with their fields", async ({ page }) => {
  await page.goto("/register");
  await page.getByRole("button", { name: "Create account" }).click();

  const email = page.getByLabel("Email");
  await expect(email).toHaveAttribute("aria-invalid", "true");
  await expect(email).toHaveAttribute("aria-describedby", "register-email-error");
  await expect(page.locator("#register-email-error")).toBeVisible();

  const password = page.getByLabel("Password", { exact: true });
  await expect(password).toHaveAttribute("aria-invalid", "true");
  await expect(password).toHaveAttribute("aria-describedby", "password-error");
  await expect(page.locator("#password-error")).toBeVisible();
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
  await page.setViewportSize({ width: 1440, height: 900 });
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
  const identity = page.getByLabel("Current Phoenix identity");
  await expect(identity).toBeVisible();
  await expect(identity).toContainText("Phoenix E2E Trader");
  await expect(identity).toContainText(e2eUser.email);
  await expect(identity).not.toContainText(
    /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i,
  );
  await expect(
    page.getByRole("navigation", { name: "Primary trading navigation" }).getByRole("link"),
  ).toHaveCount(4);

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
  await expect(navigation.getByRole("link")).toHaveCount(4);
  await expect(page.getByLabel("Current Phoenix identity")).toBeHidden();
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

test("requires confirmation before deleting an unused Trading Account", async ({ page }) => {
  await page.goto("/login");
  await signIn(page);
  await expect(page).toHaveURL(/\/trading$/);
  await page.goto("/trading/settings");
  const createAccount = page.locator("details").filter({ hasText: "Add Account" });
  await createAccount.getByText("Add Account").click();
  await createAccount.getByLabel("Account Name").fill("Disposable E2E Account");
  await createAccount.getByLabel("Broker").fill("Phoenix Broker");
  await createAccount.getByLabel("Account Type").fill("cash");
  await createAccount.getByLabel("Currency (3-letter code)").fill("EUR");
  await createAccount.getByLabel("Initial Balance").fill("1000.00");
  await createAccount.getByLabel("Status").fill("active");
  await createAccount.getByRole("button", { name: "Create Trading Account" }).click();
  await expect(page.getByText("Disposable E2E Account")).toBeVisible();
  await page
    .getByRole("article")
    .filter({ hasText: "Disposable E2E Account" })
    .getByText("Edit Account")
    .click();
  const deleteButton = page
    .getByRole("article")
    .filter({ hasText: "Disposable E2E Account" })
    .getByRole("button", { name: "Delete account" });

  page.once("dialog", (dialog) => dialog.dismiss());
  await deleteButton.click();
  await expect(page.getByText("Disposable E2E Account")).toBeVisible();

  page.once("dialog", (dialog) => dialog.accept());
  await deleteButton.click();
  await expect(page).toHaveURL(/success=account-deleted/);
  await expect(page.getByText("Trading Account deleted.")).toBeVisible();
  await expect(page.getByText("Disposable E2E Account")).toHaveCount(0);
});

test("previews, confirms, and de-duplicates a sanitized historical Trade import", async ({
  page,
}) => {
  await page.goto("/login");
  await signIn(page);
  await page.getByRole("link", { name: "New Trade" }).click();
  await page.getByRole("link", { name: "Import historical Trades" }).click();
  await expect(page).toHaveURL(/\/trading\/import$/);
  const ticket = `E2E-${Date.now()}`;
  const csv = [
    "Broker,Compte ID,Ticket,Heure d'ouverture,Heure de fermeture,Prix de fermeture,Symbole,Type,Lots,Prix d'entrée,Stop Loss,Take Profit,Commentaire,Profit net",
    `RaiseGlobal-Live,E2E-SOURCE,${ticket},2026-08-17T08:00:00Z,2026-08-17T08:20:00Z,\"2405,00\",Gold,Buy,\"0,01\",\"2400,00\",\"2390,00\",\"2410,00\",AURUM TP1,\"10,00 €\"`,
  ].join("\n");
  await page.getByLabel("Historical Trade CSV").setInputFiles({
    name: "raiseglobal-sanitized.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(csv),
  });
  await page.getByRole("button", { name: "Analyze CSV" }).click();
  await expect(page.getByText("1 wins · 0 losses · 0 breakeven")).toBeVisible();
  await page
    .getByLabel("Phoenix Trading Account")
    .selectOption({ label: "E2E EUR Account — Phoenix Broker — EUR" });
  await page.getByLabel("AURUM VIP Setup").selectOption({ label: "E2E Breakout — 5m" });
  await page.getByRole("button", { name: "Preview import" }).click();
  await expect(page.getByText(ticket)).toBeVisible();
  await expect(page.getByText("Dates detected").locator("..")).toContainText("1");
  await expect(page.getByText("Existing Sessions").locator("..")).toContainText("1");
  await expect(page.getByText("Valid: 1 · Duplicates: 0 · Invalid: 0")).toBeVisible();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Confirm import" }).click();
  await expect(page.getByText("Existing mapped: 1 · Created: 0")).toBeVisible();
  await expect(page.getByText("Imported: 1 · Duplicates: 0")).toBeVisible();

  await page.getByRole("button", { name: "Analyze CSV" }).click();
  await expect(page.getByRole("button", { name: "Analyze CSV" })).toBeEnabled();
  await page
    .getByLabel("Phoenix Trading Account")
    .selectOption({ label: "E2E EUR Account — Phoenix Broker — EUR" });
  await page.getByLabel("AURUM VIP Setup").selectOption({ label: "E2E Breakout — 5m" });
  await page.getByRole("button", { name: "Preview import" }).click();
  await expect(page.getByText("Valid: 0 · Duplicates: 1 · Invalid: 0")).toBeVisible();
  await expect(page.getByRole("button", { name: "Confirm import" })).toBeDisabled();
});

test("creates missing historical Sessions with an editable batch type on mobile", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/login");
  await signIn(page);
  await expect(page).toHaveURL(/\/trading$/);
  await page.goto("/trading/import");
  await page.waitForLoadState("networkidle");
  const ticket = `E2E-CREATE-${Date.now()}`;
  const csv = csvFor(ticket, "2026-08-23");
  await page.getByLabel("Historical Trade CSV").setInputFiles({
    name: "historical-session.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(csv),
  });
  await page.getByRole("button", { name: "Analyze CSV" }).click();
  await page
    .getByLabel("Phoenix Trading Account")
    .selectOption({ label: "E2E EUR Account — Phoenix Broker — EUR" });
  await page.getByLabel("AURUM VIP Setup").selectOption({ label: "E2E Breakout — 5m" });
  await page.getByLabel("Session type for missing dates").fill("Imported archive");
  await page.getByRole("button", { name: "Preview import" }).click();
  await page.getByText("Review Session plan").click();
  await expect(page.getByText("2026-08-23 · Imported archive · Will create")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Confirm import" }).click();
  await expect(page.getByText("Existing mapped: 0 · Created: 1")).toBeVisible();
  await expect(page.getByText("Imported: 1 · Duplicates: 0")).toBeVisible();
});

test("requires an explicit choice for an ambiguous historical Session date", async ({ page }) => {
  await page.goto("/login");
  await signIn(page);
  await expect(page).toHaveURL(/\/trading$/);
  await page.goto("/trading/import");
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Historical Trade CSV").setInputFiles({
    name: "ambiguous-session.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(csvFor(`E2E-AMBIGUOUS-${Date.now()}`, "2026-08-24")),
  });
  await page.getByRole("button", { name: "Analyze CSV" }).click();
  await page
    .getByLabel("Phoenix Trading Account")
    .selectOption({ label: "E2E EUR Account — Phoenix Broker — EUR" });
  await page.getByLabel("AURUM VIP Setup").selectOption({ label: "E2E Breakout — 5m" });
  await page.getByRole("button", { name: "Preview import" }).click();
  await expect(page.getByText("Action required", { exact: false }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Confirm import" })).toBeDisabled();
  await page.getByLabel(/Session for 2026-08-24/).selectOption({ label: "2026-08-24 — London" });
  await expect(page.getByText(/Session choices changed/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Confirm import" })).toBeDisabled();
  await page.getByRole("button", { name: "Preview import" }).click();
  const sessionResolution = page.locator("section").filter({
    has: page.getByRole("heading", { name: "3. Resolve Sessions" }),
  });
  await expect(sessionResolution.locator("p").filter({ hasText: "Ambiguous" })).toContainText("0");
  await expect(page.getByRole("button", { name: "Confirm import" })).toBeEnabled();
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
  await page.getByLabel("Entry Price").fill("not-a-price");
  await page.getByLabel("Stop Loss").fill("1.09");
  await page.getByLabel("Take Profit").fill("1.12");
  await page.getByLabel("Position Size").fill("2");
  await page.getByLabel("Risk (%)").fill("1.25");
  await page.getByLabel("Result").fill("win");
  await page.getByLabel(/Realized P&L/).fill("125.50");
  await page.getByRole("button", { name: "Record Trade" }).click();
  const entryPrice = page.getByLabel("Entry Price");
  await expect(entryPrice).toHaveAttribute("aria-invalid", "true");
  await expect(entryPrice).toHaveAttribute("aria-describedby", "entryPrice-error");
  await expect(page.locator("#entryPrice-error")).toBeVisible();
  await expect(page.getByLabel("Trade Date")).toHaveValue("2026-08-17");
  await expect(page.getByLabel("Asset")).toHaveValue("EURUSD");
  await expect(page.getByLabel("Stop Loss")).toHaveValue("1.09");
  await expect(page.getByLabel("Take Profit")).toHaveValue("1.12");
  await expect(page.getByLabel("Position Size")).toHaveValue("2");
  await expect(page.getByLabel("Risk (%)")).toHaveValue("1.25");
  await expect(page.getByLabel("Result")).toHaveValue("win");
  await expect(page.getByLabel(/Realized P&L/)).toHaveValue("125.50");
  await entryPrice.fill("1.1");
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
  await page.goto("/");
  await expect(page).toHaveURL(/\/trading$/);
});

test("routes an authenticated user without a Trader to onboarding", async ({ page }) => {
  await page.goto("/login");
  await signIn(page, e2eMissingProfileUser);
  await expect(page).toHaveURL(/\/onboarding$/);
  await expect(
    page.getByRole("heading", { name: "Build your trading operating system" }),
  ).toBeVisible();
  await page
    .context()
    .addCookies([{ name: "phoenix-locale", value: "fr", url: "http://127.0.0.1:3000" }]);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Créez votre système d’exploitation du trading" }),
  ).toBeVisible();
  await expect(page.getByLabel("Nom de l’espace")).toBeVisible();
  await expect(page.getByRole("button", { name: "Configurer mon environnement" })).toBeVisible();
  await page.getByRole("button", { name: "Configurer mon environnement" }).click();
  await expect(page.locator('p[role="alert"]')).toHaveText("Vérifiez les champs signalés.");
  await page.goto("/");
  await expect(page).toHaveURL(/\/onboarding$/);
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
  for (const viewport of requiredViewports) {
    await page.setViewportSize(viewport);
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "Discipline before profit." })).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
    await expectNoHorizontalOverflow(page, viewport.width);
  }

  await signIn(page);
  await expect(page).toHaveURL(/\/trading$/);
  for (const viewport of requiredViewports) {
    await page.setViewportSize(viewport);
    await page.goto("/trading");
    await expect(page.getByRole("heading", { name: "Trading Dashboard" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Logout" })).toBeVisible();
    await expectNoHorizontalOverflow(page, viewport.width);
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
