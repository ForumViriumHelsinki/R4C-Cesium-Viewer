import { test, expect } from "@playwright/test";
import { setupDigitransitMock } from "./setup/digitransit-mock";

// Setup digitransit mocking for all tests in this file
setupDigitransitMock();

test("Page load", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/R4C Uusimaa Demo/);
});

test("HSY Background maps", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Close" }).click();
  await page.getByRole("button", { name: "HSY Background maps" }).click();
  await page.getByPlaceholder(" Search for WMS layers").click();
  await page.getByPlaceholder(" Search for WMS layers").fill("Kaupunginosat");
  await expect(page.locator("v-list-item-group")).toContainText(
    "Kaupunginosat pääkaupunkiseutu 2022",
  );
});

test("Building properties", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Close" }).click();
  await page.locator("canvas").click({
    position: {
      x: 690,
      y: 394,
    },
  });
  // Wait for map transition to complete
  await page.waitForLoadState("networkidle");
  await page.locator("canvas").click({
    position: {
      x: 674,
      y: 363,
    },
  });
  // Wait for building properties button to be available
  await page.waitForSelector('button:has-text("Building properties")', { state: 'visible' });
  await page.getByRole("button", { name: "Building properties" }).click();
  await expect(page.locator("#printContainer")).toContainText("Talousrakennus");
  await expect(page.locator("canvas")).toBeVisible();
});

test("Heat Vulnerability", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Close" }).click();
  await page.getByLabel("Statistical Grid").check();
  await page
    .locator("div")
    .filter({ hasText: /^250m grid$/ })
    .locator("span")
    .click();
  await page.getByRole("heading", { name: "Heat Vulnerability" }).click();
  await expect(
    page.getByRole("heading", { name: "Heat Vulnerability" }),
  ).toBeVisible();
});
