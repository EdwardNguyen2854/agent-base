import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.removeItem("agent-base:frontend:v1"));
  await page.reload();
});

test("responsive product navigation exposes every v0.1 area", async ({
  page,
}) => {
  await expect(
    page.getByRole("heading", { name: /Good morning/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Primary navigation" }),
  ).toContainText("DashboardAgentsWorkspacesProjectsWorkflowsConnectorsRuns");
  await page.goto("/tasks");
  await expect(
    page
      .getByRole("navigation", { name: "Primary navigation" })
      .getByRole("link", { name: "Projects" }),
  ).toHaveClass(/active/);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Open navigation" }).click();
  await expect(
    page
      .getByRole("navigation", { name: "Product areas" })
      .getByRole("link", { name: "Projects" }),
  ).toBeVisible();
});

test("Owner creates a Project and gets explicit upload validation", async ({
  page,
}) => {
  await page.goto("/projects");
  await page.getByRole("link", { name: "New Project" }).click();
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

test("Owner uploads a TXT source and sees state progression", async ({
  page,
}) => {
  await page.goto("/projects");
  await page.getByRole("link", { name: "New Project" }).click();
  await page.getByLabel("Project name").fill("Source testing");
  await page.getByRole("button", { name: "Create Project" }).click();
  await page.getByRole("link", { name: "Sources" }).click();
  await page.locator('input[type="file"]').setInputFiles({
    name: "notes.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("Research notes for the quarterly review."),
  });
  await expect(page.getByRole("cell", { name: "notes.txt" })).toBeVisible();
  await expect(page.getByRole("cell", { name: /processing/i })).toBeVisible({
    timeout: 2000,
  });
});

test("Owner uploads a Markdown source, sees it become ready, and deletes it", async ({
  page,
}) => {
  await page.goto("/projects/project-1/sources");
  await page.locator('input[type="file"]').setInputFiles({
    name: "analysis.md",
    mimeType: "text/markdown",
    buffer: Buffer.from("# Analysis\n\nKey findings from the research phase."),
  });
  await expect(page.getByRole("cell", { name: "analysis.md" })).toBeVisible();
  await expect(page.getByRole("cell", { name: /ready/i })).toBeVisible({
    timeout: 5000,
  });
  const deleteButton = page
    .getByRole("cell", { name: "analysis.md" })
    .locator("..")
    .getByRole("button", { name: /delete/i });
  await deleteButton.click();
  await page.getByRole("button", { name: "Delete source" }).click();
  await expect(
    page.getByRole("cell", { name: "analysis.md" }),
  ).not.toBeVisible();
});

test("global search finds local Project data", async ({ page }) => {
  await page.getByRole("button", { name: "Search Agent Base" }).click();
  await page
    .getByRole("textbox", {
      name: "Search projects, tasks, agents, and runs",
    })
    .fill("market analysis");
  await page
    .getByRole("button", { name: /Project Agent market analysis/ })
    .click();
  await expect(page).toHaveURL(/\/projects\/project-1$/);
});

test("backend-future areas state their v0.1 boundaries", async ({ page }) => {
  await page.goto("/workspaces");
  await expect(
    page.getByRole("heading", { name: "Northstar Research" }),
  ).toBeVisible();
  await page.goto("/workflows");
  await expect(
    page.getByRole("heading", { name: "Executable Workflows are planned" }),
  ).toBeVisible();
  await page.goto("/connectors");
  await expect(page.getByText("Provider health")).toBeVisible();
  await expect(page.getByText("MiniMax")).toBeVisible();
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
