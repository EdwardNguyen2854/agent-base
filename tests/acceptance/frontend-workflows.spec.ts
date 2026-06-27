import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.removeItem("agent-base:frontend:v1"));
  await page.reload();
});

test("responsive workspace navigation exposes every v0.1 area", async ({
  page,
}) => {
  await expect(
    page.getByRole("heading", { name: /Good morning/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Primary navigation" }),
  ).toContainText("OverviewAgentsProjectsTasksRuns");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Open navigation" }).click();
  await expect(page.getByRole("link", { name: "Projects" })).toBeVisible();
});

test("Owner creates a Project and gets explicit upload validation", async ({
  page,
}) => {
  await page.goto("/projects");
  await page.getByRole("button", { name: "New Project" }).click();
  await page.getByLabel("Project name").fill("Quarterly research");
  await page
    .getByLabel("Description")
    .fill("Evidence for the next planning cycle");
  await page.getByRole("button", { name: "Create Project" }).click();
  await expect(
    page.getByRole("heading", { name: "Quarterly research" }),
  ).toBeVisible();
  await page.locator('input[type="file"]').setInputFiles({
    name: "unsupported.png",
    mimeType: "image/png",
    buffer: Buffer.from("fake"),
  });
  await expect(
    page.getByText(/Unsupported file\. Use text-based/),
  ).toBeVisible();
});

test("Owner approves a Research Plan and advances the Run", async ({
  page,
}) => {
  await page.goto("/runs/run-2");
  await expect(
    page.getByRole("heading", { name: "Review the Research Plan" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Approve & continue" }).click();
  await expect(page.getByText("Research in progress")).toBeVisible();
  await page.getByRole("button", { name: "Simulate next checkpoint" }).click();
  await expect(page.getByText("50%", { exact: true })).toBeVisible();
});

test("Owner inspects a citation, requests revision, and accepts a Report", async ({
  page,
}) => {
  await page.goto("/reports/report-1");
  await page.locator(".citation").first().click();
  await expect(page.getByText("Retained source excerpt")).toBeVisible();
  await page.getByRole("button", { name: "Close" }).click();
  await page.getByRole("button", { name: "Request revision" }).click();
  await page
    .getByLabel("Revision feedback")
    .fill("Add a comparison of implementation risks.");
  await page.getByRole("button", { name: "Start revision Run" }).click();
  await expect(page).toHaveURL(/\/runs\//);
});

test("setup validates simulated Credentials and completes", async ({
  page,
}) => {
  await page.goto("/setup");
  await page.getByRole("button", { name: "Set up providers" }).click();
  await page.getByLabel("MiniMax Token Plan key").fill("minimax-demo-key");
  await page.getByLabel("Tavily API key").fill("tavily-demo-key");
  await page.getByRole("button", { name: /Validate & continue/ }).click();
  await expect(
    page.getByRole("heading", { name: "Your research workspace is ready." }),
  ).toBeVisible();
});
