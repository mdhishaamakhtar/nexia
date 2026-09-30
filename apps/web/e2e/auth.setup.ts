import { expect, test as setup } from "@playwright/test";
import { confirmEmail } from "./support/db";
import { STORAGE_STATE, USER } from "./support/env";

setup("create, confirm and sign in the shared account", async ({ page }) => {
  await page.goto("/login#signup");
  await page.getByLabel("Email").fill(USER.email);
  await page.getByLabel("Password").fill(USER.password);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible();

  await confirmEmail(USER.email);

  await page.goto("/login");
  await page.getByLabel("Email").fill(USER.email);
  await page.getByLabel("Password").fill(USER.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/profiles$/);

  await page.context().storageState({ path: STORAGE_STATE });
});
