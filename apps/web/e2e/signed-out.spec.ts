import { expect, test, type Page } from "@playwright/test";
import { USER } from "./support/env";
import { alertWith } from "./support/page";

async function signIn(page: Page, email: string, password: string) {
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
}

test("a signed-out link to the slambook signs in, then lands where it pointed", async ({
  page,
}) => {
  await page.goto("/profiles/new");
  await expect(page).toHaveURL(/\/login\?next=%2Fprofiles%2Fnew$/);

  await signIn(page, USER.email, USER.password);
  await expect(page).toHaveURL(/\/profiles\/new$/);
});

test("a wrong password doesn't say whether the account exists", async ({ page }) => {
  await page.goto("/login");
  await signIn(page, "nobody@nexia.test", "not-the-password");
  await expect(alertWith(page, "That email and password don't match")).toBeVisible();
});

test("an unconfirmed account is offered a new link", async ({ page }) => {
  const email = `unconfirmed-${Date.now()}@nexia.test`;
  await page.goto("/login#signup");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("a-long-enough-password");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible();

  await page.goto("/login");
  await signIn(page, email, "a-long-enough-password");
  await expect(alertWith(page, "Confirm your email first")).toBeVisible();

  await page.getByRole("button", { name: "Send me a new link" }).click();
  await expect(page.getByText("A new link is on its way")).toBeVisible();
});
