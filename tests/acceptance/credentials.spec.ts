import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.removeItem("agent-base:frontend:v1"));
  await page.reload();
});

test("Owner replaces a credential in Settings and the hint updates", async ({
  page,
}) => {
  await page.goto("/settings/credentials");
  await expect(
    page.getByRole("heading", { name: "Credentials" }),
  ).toBeVisible();

  const miniMaxRow = page.getByText("MiniMax").first();
  await expect(miniMaxRow).toBeVisible();

  await page.getByRole("button", { name: /Replace/ }).first().click();
  await expect(
    page.getByRole("heading", { name: /Replace MiniMax/ }),
  ).toBeVisible();

  await page
    .getByLabel("MiniMax API key")
    .fill("sk-test-key-for-acceptance");
  await page.getByRole("button", { name: /Validate & replace/ }).click();

  await expect(
    page.getByText("•••• ANCE").or(page.getByText("MiniMax credential validated")),
  ).toBeVisible({ timeout: 5000 });
});

test("Settings page never exposes plaintext credential secrets", async ({
  page,
}) => {
  await page.goto("/settings/credentials");

  const html = await page.locator("html").innerHTML();
  expect(html).not.toContain("sk-test-key");
  expect(html).not.toContain("tvly-test-key");
});

test("replace dialog rejects short credentials with a mock validation error", async ({
  page,
}) => {
  await page.goto("/settings/credentials");
  await page.getByRole("button", { name: /Replace/ }).first().click();

  const submitButton = page.getByRole("button", { name: /Validate & replace/ });
  await expect(submitButton).toBeDisabled();

  await page.getByLabel("MiniMax API key").fill("ab");
  await expect(submitButton).toBeDisabled();

  await page.getByLabel("MiniMax API key").fill("123456");
  await expect(submitButton).toBeEnabled();
});

test("Tavily credential can be replaced independently", async ({ page }) => {
  await page.goto("/settings/credentials");

  await page.getByText("Tavily").first().click();
  await page.getByRole("button", { name: /Replace/ }).last().click();

  await page
    .getByLabel("Tavily API key")
    .fill("tvly-test-key-for-tavily");
  await page.getByRole("button", { name: /Validate & replace/ }).click();

  await expect(
    page.getByText(/Tavily credential validated/),
  ).toBeVisible({ timeout: 5000 });
});
