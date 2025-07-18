import { APPS } from "@data/e2eTestData";
import { AppInstallationPage } from "@pages/appInstallationPage";
import { AppPage } from "@pages/appPageThirdparty";
import { ExtensionsPage } from "@pages/extensionsPage";
import { expect } from "@playwright/test";
import { test } from "utils/testWithPermission";

test.use({ permissionName: "admin" });

let extensionsPage: ExtensionsPage;
let installationPage: AppInstallationPage;
let appPage: AppPage;

test.beforeEach(({ page }) => {
  extensionsPage = new ExtensionsPage(page);
  installationPage = new AppInstallationPage(page);
  appPage = new AppPage(page);
});

const PRE_INSTALLATION_TIMEOUT = 20 * 1000;
const INSTALLATION_PENDING_TIMEOUT = 50 * 1000;
const APP_EXPECT_UI_TIMEOUT = 15 * 1000;

test("TC: SALEOR_119 User should be able to install and configure app from manifest #e2e", async ({
  page,
}) => {
  await extensionsPage.gotoInstalledExtensionsList();
  await extensionsPage.addExtensionsOpenDropdownButton.click();
  await extensionsPage.installCustomExtensionOption.click();
  await extensionsPage.typeManifestUrl("https://klaviyo.saleor.app/api/manifest");
  await extensionsPage.installAppFromManifestButton.click();
  await expect(installationPage.appInstallationPageHeader).toHaveText(
    "You are about to install Klaviyo",
    {
      // Klaviyo app can take a while to respond with manifest if it's
      // cold-starting
      timeout: PRE_INSTALLATION_TIMEOUT,
    },
  );
  await installationPage.installAppButton.click();

  await extensionsPage.expectSuccessBanner({ timeout: INSTALLATION_PENDING_TIMEOUT });
  await expect(extensionsPage.installedExtensionsRow.first()).toBeVisible();
  await expect(extensionsPage.installationPendingLabel).not.toBeVisible();

  await expect(extensionsPage.appKlaviyoViewDetailsButton).toContainText("View details");
  await expect(
    extensionsPage.installedExtensionsRow.filter({ hasText: "Klaviyo" }).first(),
  ).toBeVisible();
  await extensionsPage.appKlaviyoViewDetailsButton.click();

  const iframeLocator = page.frameLocator("iframe");

  await expect(iframeLocator.getByLabel("PUBLIC_TOKEN")).toBeVisible({
    // Klavyio's UI can take a while to load initially
    timeout: APP_EXPECT_UI_TIMEOUT,
  });
  await iframeLocator.getByLabel("PUBLIC_TOKEN").fill("test_token");
  await iframeLocator.getByText("Save").click();
  await extensionsPage.expectSuccessBanner({ timeout: INSTALLATION_PENDING_TIMEOUT });
});
test("TC: SALEOR_120 User should be able to delete thirdparty app #e2e", async () => {
  await appPage.waitForNetworkIdleAfterAction(() =>
    appPage.goToExistingAppPage(APPS.appToBeDeleted.id),
  );
  await appPage.pageHeader.waitFor({ state: "visible", timeout: 10000 });
  await expect(appPage.pageHeader).toContainText("Saleor QA App");
  await appPage.deleteButton.click();
  await appPage.deleteAppDialog.clickDeleteButton();
  await extensionsPage.expectSuccessBanner();
  await extensionsPage.waitForDOMToFullyLoad();
  await expect(extensionsPage.installedExtensionsRow.first()).toBeVisible();
  await expect(extensionsPage.appQA).not.toBeVisible();
});
