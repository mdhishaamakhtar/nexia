import { expect, test, type Page } from "@playwright/test";
import { toast } from "./support/page";

/** A name no other test (or retry) will have made. */
function uniqueName(first: string): string {
  return `${first} ${Math.random().toString(36).slice(2, 7)}`;
}

function navbarHome(page: Page) {
  return page
    .getByRole("navigation", { name: "Main" })
    .getByRole("link", { name: "Nexia", exact: true });
}

test("a profile can be made with every kind of control, then found, edited and deleted", async ({
  page,
}) => {
  const name = uniqueName("Priya");
  await page.goto("/profiles/new");

  await page.getByLabel("Full name").fill(name);

  const relationship = page.getByRole("combobox", { name: "Relationship" });
  await relationship.click();
  await page.getByRole("option", { name: "Classmate" }).click();
  await expect(relationship).toHaveText("Classmate");

  // The calendar opens on years, since a birthday is decades back.
  await page.getByRole("button", { name: "Birthday" }).click();
  await page.getByRole("option", { name: "1996" }).click();
  await page.getByRole("option", { name: "Mar" }).click();
  await page.getByRole("button", { name: "March 16, 1996" }).click();
  await expect(page.getByRole("button", { name: "Clear birthday" })).toBeVisible();

  const tags = page.getByRole("textbox", { name: "Tags" });
  await tags.fill("night owl");
  await tags.press("Enter");
  // Typed but never added: saving must keep it rather than drop it.
  await tags.fill("chai person");

  await page.getByRole("button", { name: "Save profile" }).click();

  await expect(page).toHaveURL(/\/profiles\/\d+$/);
  await expect(toast(page, `${name} is in your slambook`)).toHaveCount(1);
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
  await expect(page.getByText("Pisces").first()).toBeVisible();
  await expect(page.getByText("night owl")).toBeVisible();
  await expect(page.getByText("chai person")).toBeVisible();

  // The PDF export draws on a real canvas, so it is checked here, not in jsdom.
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Save profile as PDF" }).click();
  const pdf = await download;
  expect(pdf.suggestedFilename()).toMatch(/\.pdf$/);
  await expect(toast(page, "PDF saved")).toHaveCount(1);

  await page.getByRole("link", { name: "Edit" }).click();
  await page.getByLabel("Profession").fill("Illustrator");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(toast(page, "Changes saved")).toHaveCount(1);
  await expect(page.getByText("Illustrator")).toBeVisible();

  // The search lives in the URL, so the filtered list can be linked to.
  await page.goto("/profiles");
  await page.getByRole("searchbox", { name: "Search profiles by name" }).fill(name);
  await expect(page).toHaveURL(/\?q=/);
  await page.getByRole("link", { name: new RegExp(name) }).click();

  await page.getByRole("button", { name: "Delete profile" }).click();
  const confirm = page.getByRole("alertdialog");
  await expect(confirm).toContainText(`Delete ${name}?`);
  await confirm.getByRole("button", { name: "Delete" }).click();

  await expect(page).toHaveURL(/\/profiles$/);
  await expect(toast(page, `${name} was removed from your slambook`)).toHaveCount(1);
  await expect(page.getByRole("heading", { name })).toHaveCount(0);
});

test("leaving a half-filled form asks first", async ({ page }) => {
  await page.goto("/profiles/new");
  await page.getByLabel("Full name").fill("Someone half-written");

  await navbarHome(page).click();
  const confirm = page.getByRole("alertdialog");
  await expect(confirm).toContainText("Leave without saving?");
  await confirm.getByRole("button", { name: "Keep editing" }).click();
  await expect(page).toHaveURL(/\/profiles\/new$/);
  await expect(page.getByLabel("Full name")).toHaveValue("Someone half-written");

  await navbarHome(page).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Leave" }).click();
  await expect(page).toHaveURL(/\/profiles$/);
});

test("a profile that isn't there shows a note, not an error page", async ({ page }) => {
  await page.goto("/profiles/999999");
  await expect(page.getByText("This person isn't in your slambook")).toBeVisible();
});
