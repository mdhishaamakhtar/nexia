import { expect, test } from "@playwright/test";

test("chat says plainly when it isn't set up", async ({ page }) => {
  await page.goto("/chat");
  await expect(
    page.getByRole("heading", { name: "What would you like to remember?" })
  ).toBeVisible();

  await page.getByRole("button", { name: "Whose birthday is coming up?" }).click();
  await expect(page.getByText("Chat isn't set up on this server yet")).toBeVisible();
});
