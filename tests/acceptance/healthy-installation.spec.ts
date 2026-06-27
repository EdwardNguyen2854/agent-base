import { expect, test } from "@playwright/test";

test("installed Agent Base exposes a healthy loopback interface", async ({
  page,
  request,
}) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", {
      name: "Your local research workspace is running.",
    }),
  ).toBeVisible();
  await expect(page.getByText("web: healthy")).toBeVisible();
  await expect(page.getByText("worker: healthy")).toBeVisible();
  await expect(page.getByText("database: healthy")).toBeVisible();

  const health = await request.get("/api/health");
  expect(health.status()).toBe(200);
  await expect(health.json()).resolves.toMatchObject({ status: "healthy" });
});
