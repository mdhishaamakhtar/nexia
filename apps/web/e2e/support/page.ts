import type { Page } from "@playwright/test";

/**
 * A toast, found through the live region screen readers hear it from. The
 * visible slip repeats the text, so matching the text alone finds two.
 */
export function toast(page: Page, message: string) {
  return page.getByRole("status").filter({ hasText: message });
}

/**
 * An inline alert with this text. The page always carries other, empty alert
 * regions (the toast's, Next's route announcer), so a bare role matches several.
 */
export function alertWith(page: Page, text: string) {
  return page.getByRole("alert").filter({ hasText: text });
}
