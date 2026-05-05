import {
  expect,
  request,
  test,
  type APIRequestContext,
  type APIResponse,
  type Page
} from "@playwright/test";
import {
  burstRequest,
  fixtureAdmin,
  fixtureNodeOwner,
  fixtureSecondNodeOwner,
  publicLookupFailureFixture,
  publicLookupSuccessFixture,
  validMeshMessage
} from "@loom/test-fixtures";

const apiBaseUrl = () => {
  const value = process.env.LOOM_E2E_API_URL;
  if (!value) throw new Error("LOOM_E2E_API_URL was not set by global setup.");
  return value;
};

const webBaseUrl = () => {
  const value = process.env.LOOM_E2E_WEB_URL;
  if (!value) throw new Error("LOOM_E2E_WEB_URL was not set by global setup.");
  return value;
};

test.describe.configure({ mode: "serial" });

test.describe("hosted web/API e2e", () => {
  let adminApi: APIRequestContext;

  test.beforeAll(async () => {
    adminApi = await request.newContext({ baseURL: apiBaseUrl() });
    await loginAdmin(adminApi);
  });

  test.afterAll(async () => {
    await adminApi?.dispose();
  });

  test("ingests mobile bursts and exposes public map/history flows", async ({ page }) => {
    await registerNode(adminApi, fixtureNodeOwner);
    await registerNode(adminApi, fixtureSecondNodeOwner);

    await expectAccepted(
      await adminApi.post("/api/ingest/burst", { data: burstRequest() }),
      1,
      0,
      0
    );
    await expectAccepted(
      await adminApi.post("/api/ingest/burst", { data: burstRequest() }),
      0,
      1,
      0
    );
    await expectAccepted(
      await adminApi.post("/api/ingest/burst", {
        data: burstRequest([validMeshMessage()], { mobileInstallationId: "mobile-e2e-2" })
      }),
      0,
      1,
      0
    );

    const [firstRace, secondRace] = await Promise.all([
      adminApi.post("/api/ingest/burst", {
        data: burstRequest([validMeshMessage({ seqId: 9 })], {
          mobileInstallationId: "mobile-race-1"
        })
      }),
      adminApi.post("/api/ingest/burst", {
        data: burstRequest([validMeshMessage({ seqId: 9 })], {
          mobileInstallationId: "mobile-race-2"
        })
      })
    ]);
    const raceBodies = await Promise.all([firstRace.json(), secondRace.json()]);
    expect(raceBodies[0].accepted.length + raceBodies[1].accepted.length).toBe(1);
    expect(raceBodies[0].duplicate.length + raceBodies[1].duplicate.length).toBe(1);

    await expectAccepted(
      await adminApi.post("/api/ingest/burst", {
        data: burstRequest([
          validMeshMessage({ seqId: 10, message: "medical_help" }),
          {
            seqId: "bad"
          } as never
        ])
      }),
      1,
      0,
      1
    );

    await page.goto(`${webBaseUrl()}/public`);
    await expect(page.getByRole("heading", { name: "Public network map" })).toBeVisible();
    await expect(page.locator("body")).toContainText("Nodes 2");
    await expect(page.locator("body")).toContainText("Reports 3");

    await page.getByLabel("Filter by category").selectOption("medical_help");
    await expect(page.locator("body")).toContainText("Reports 1");
    await page.getByRole("button", { name: "Markers" }).click();
    await expect(page.getByText("Marker preview")).toBeVisible();
    await page.locator("select").first().selectOption("satellite");
    await expect(page.locator("body")).toContainText("satellite");

    await runPublicLookup(
      page,
      publicLookupSuccessFixture.ownerFullName,
      publicLookupSuccessFixture.ownerBirthDate
    );
    await expect(page.getByText("3 messages found")).toBeVisible();

    await page.goto(`${webBaseUrl()}/public/history`);
    await runPublicLookup(
      page,
      publicLookupFailureFixture.ownerFullName,
      publicLookupFailureFixture.ownerBirthDate
    );
    await expect(page.getByText("No matching history could be returned.")).toBeVisible();
    await runPublicLookup(page, "Unknown Person", fixtureNodeOwner.ownerBirthDate);
    await expect(page.getByText("No matching history could be returned.")).toBeVisible();
  });

  test("supports admin login, node registry, map detail, and message history", async ({ page }) => {
    await page.goto(`${webBaseUrl()}/admin/login`);
    await page.getByLabel("Username").fill(fixtureAdmin.username);
    await page.getByLabel("Password", { exact: true }).fill(fixtureAdmin.password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByText("Registered nodes")).toBeVisible();

    await page.goto(`${webBaseUrl()}/admin/nodes`);
    await page.getByRole("button", { name: "Register node" }).click();
    const dialog = page.locator(".fixed").last();
    await dialog.getByLabel("Node ID").fill("99");
    await dialog.getByLabel("Owner full name").fill("Citra Dewi");
    await dialog.getByLabel("Owner birth date").fill("1995-05-12");
    await dialog
      .locator("form")
      .getByRole("button", { name: "Register node", exact: true })
      .click();
    await expect(page.getByText("Citra Dewi")).toBeVisible();

    await page.getByRole("button", { name: "Register node" }).click();
    const duplicateDialog = page.locator(".fixed").last();
    await duplicateDialog.getByLabel("Node ID").fill("99");
    await duplicateDialog.getByLabel("Owner full name").fill("Citra Dewi");
    await duplicateDialog.getByLabel("Owner birth date").fill("1995-05-12");
    await duplicateDialog
      .locator("form")
      .getByRole("button", { name: "Register node", exact: true })
      .click();
    await expect(page.getByText("Node ID is already registered.")).toBeVisible();
    await page.getByLabel("Close register node dialog").click();

    await page.getByLabel("Search node ID or owner name").fill("99");
    await expect(page.getByText("Citra Dewi")).toBeVisible();
    await page.getByLabel("Search node ID or owner name").fill("Ayu");
    await expect(page.getByText("Ayu Lestari")).toBeVisible();

    await page.goto(`${webBaseUrl()}/admin/map`);
    await expect(page.getByText("Selected node")).toBeVisible();
    await page.getByLabel("Map type").selectOption("satellite");
    await page.getByRole("button", { name: "Marker-only" }).click();
    await page.getByRole("button", { name: "Select marker 42" }).click();
    await expect(page.getByText("Ayu Lestari")).toBeVisible();
    await expect(page.getByText("Range to gateway")).toBeVisible();

    await page.goto(`${webBaseUrl()}/admin/messages`);
    await page.getByLabel("Node ID").fill("42");
    await page.getByLabel("Owner name").fill("Ayu");
    await page.getByRole("button", { name: "Search" }).click();
    await expect(page.getByText("3 messages")).toBeVisible();
    await expect(page.locator("body")).toContainText("42");
    await expect(page.locator("body")).toContainText("lora_mesh");
    await expect(page.locator("body")).toContainText("2 / 1");
  });
});

const loginAdmin = async (api: APIRequestContext): Promise<void> => {
  const response = await api.post("/api/admin/auth/login", {
    data: { username: fixtureAdmin.username, password: fixtureAdmin.password }
  });
  expect(response.ok()).toBeTruthy();
};

const registerNode = async (
  api: APIRequestContext,
  node: { nodeId: number; ownerFullName: string; ownerBirthDate: string }
): Promise<void> => {
  const response = await api.post("/api/admin/nodes", { data: node });
  expect([201, 409]).toContain(response.status());
};

const expectAccepted = async (
  response: APIResponse,
  accepted: number,
  duplicate: number,
  rejected: number
): Promise<void> => {
  expect(response.status()).toBe(202);
  const body = await response.json();
  expect(body.accepted).toHaveLength(accepted);
  expect(body.duplicate).toHaveLength(duplicate);
  expect(body.rejected).toHaveLength(rejected);
};

const runPublicLookup = async (page: Page, ownerFullName: string, ownerBirthDate: string) => {
  await page.getByLabel("Owner full name").fill(ownerFullName);
  await page.getByLabel("Owner birth date").fill(ownerBirthDate);
  await page.getByRole("button", { name: "Search history" }).click();
};
