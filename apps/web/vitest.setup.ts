import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { MotionGlobalConfig } from "framer-motion";
import { afterEach } from "vitest";

// Animations end at once, so an exit never has to be waited out.
MotionGlobalConfig.skipAnimations = true;

// jsdom lays nothing out, so there is nothing to scroll and no size to watch.
Element.prototype.scrollIntoView = function scrollIntoView() {};
// A fine pointer and no preferences, like a desktop browser.
window.matchMedia ??= (query: string) =>
  ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  }) as MediaQueryList;
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

afterEach(() => {
  cleanup();
  document.cookie.split(";").forEach((c) => {
    document.cookie = `${c.split("=")[0]!.trim()}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
  });
});
