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

test("Owner can edit the Agent Draft and publish a new immutable version", async ({
  page,
  request,
}) => {
  await page.goto("/agents");

  const initial = await request.get("/api/agent");
  expect(initial.status()).toBe(200);
  const initialBody = (await initial.json()) as {
    versions: { number: number }[];
  };
  const nextVersion = (initialBody.versions.at(-1)?.number ?? 0) + 1;

  const purposeField = page.getByLabel("Purpose");
  await expect(purposeField).toBeVisible();
  const newPurpose = `Acceptance refinement ${Date.now()}`;
  await purposeField.fill(newPurpose);

  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(page.getByText("Draft saved.")).toBeVisible();

  const saved = await request.get("/api/agent");
  const savedBody = (await saved.json()) as {
    draft: { purpose: string };
  };
  expect(savedBody.draft.purpose).toBe(newPurpose);

  await page.getByRole("button", { name: "Publish version" }).click();
  await expect(page.getByText("Version published.")).toBeVisible();
  await expect(
    page.getByRole("listitem").filter({ hasText: `v${nextVersion}` }),
  ).toBeVisible();

  const final = await request.get("/api/agent");
  const finalBody = (await final.json()) as {
    versions: { number: number; purpose: string }[];
  };
  const published = finalBody.versions.at(-1);
  expect(published?.number).toBe(nextVersion);
  expect(published?.purpose).toBe(newPurpose);
});

test("Agent Draft limits exceeding platform maximums are rejected", async ({
  page,
  request,
}) => {
  await page.goto("/agents");

  const response = await request.put("/api/agent", {
    data: {
      limits: {
        modelTurns: 1,
        tavilySearches: 1,
        pageFetches: 1,
        activeMinutes: 1,
      },
    },
  });
  expect(response.status()).toBe(200);

  const conflict = await request.put("/api/agent", {
    data: {
      limits: {
        modelTurns: 99,
        tavilySearches: 1,
        pageFetches: 1,
        activeMinutes: 1,
      },
    },
  });
  expect(conflict.status()).toBe(422);
  const conflictBody = (await conflict.json()) as {
    error: string;
    limitErrors: { field: string; provided: number; maximum: number }[];
  };
  expect(conflictBody.error).toMatch(/modelTurns/i);
  expect(conflictBody.limitErrors).toContainEqual({
    field: "modelTurns",
    provided: 99,
    maximum: 20,
  });

  const restored = await request.put("/api/agent", {
    data: {
      limits: {
        modelTurns: 20,
        tavilySearches: 10,
        pageFetches: 30,
        activeMinutes: 15,
      },
    },
  });
  expect(restored.status()).toBe(200);
});
