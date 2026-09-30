import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { useLeaveGuard } from "./use-leave-guard";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

function Page({ active }: { active: boolean }) {
  const { pendingHref, stay, leave } = useLeaveGuard(active);
  return (
    <>
      <a href="/profiles">Home</a>
      <a href="/chat" target="_blank">
        New tab
      </a>
      <a href="/files/a.pdf" download>
        Download
      </a>
      <a href="https://example.com/">Elsewhere</a>
      <a href={window.location.pathname}>Here</a>
      <output>{pendingHref ?? "none"}</output>
      <button type="button" onClick={stay}>
        stay
      </button>
      <button type="button" onClick={leave}>
        leave
      </button>
    </>
  );
}

// jsdom can't navigate; stop links from trying, so only the guard acts.
function swallowNavigation() {
  document.addEventListener("click", (e) => e.preventDefault());
}

describe("the unsaved-changes guard", () => {
  beforeEach(() => {
    push.mockReset();
    swallowNavigation();
  });

  test("catches an in-app link and asks, then leaves or stays as told", async () => {
    const user = userEvent.setup();
    render(<Page active />);
    await user.click(screen.getByRole("link", { name: "Home" }));
    expect(screen.getByRole("status")).toHaveTextContent("/profiles");

    await user.click(screen.getByRole("button", { name: "stay" }));
    expect(screen.getByRole("status")).toHaveTextContent("none");

    await user.click(screen.getByRole("link", { name: "Home" }));
    await user.click(screen.getByRole("button", { name: "leave" }));
    expect(push).toHaveBeenCalledWith("/profiles");
  });

  test("leaves alone links that don't lose the page", async () => {
    const user = userEvent.setup();
    render(<Page active />);
    for (const name of ["New tab", "Download", "Elsewhere", "Here"]) {
      await user.click(screen.getByRole("link", { name }));
    }
    await user.keyboard("{Meta>}");
    await user.click(screen.getByRole("link", { name: "Home" }));
    await user.keyboard("{/Meta}");
    expect(screen.getByRole("status")).toHaveTextContent("none");
  });

  test("asks the browser before a reload or a closed tab", () => {
    render(<Page active />);
    const event = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });

  test("does nothing when there is nothing to lose", async () => {
    const user = userEvent.setup();
    render(<Page active={false} />);
    await user.click(screen.getByRole("link", { name: "Home" }));
    await user.click(screen.getByRole("button", { name: "leave" }));
    expect(screen.getByRole("status")).toHaveTextContent("none");
    expect(push).not.toHaveBeenCalled();
  });
});
