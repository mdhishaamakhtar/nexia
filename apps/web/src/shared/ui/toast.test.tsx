import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { ToastProvider, useToast } from "./toast";

function Buttons() {
  const toast = useToast();
  return (
    <>
      <button type="button" onClick={() => toast.success("Saved")}>
        ok
      </button>
      <button type="button" onClick={() => toast.error("Couldn't save")}>
        fail
      </button>
      {["one", "two", "three", "four"].map((n) => (
        <button key={n} type="button" onClick={() => toast.success(n)}>
          {n}
        </button>
      ))}
    </>
  );
}

const slips = () => screen.queryAllByRole("button", { name: "Dismiss notification" });
const click = (name: string) => fireEvent.click(screen.getByRole("button", { name }));

function setup({ fakeClock = false } = {}) {
  // Only the clock the toasts read. Exit animations still run on real frames,
  // so `gone` goes back to real time to watch a slip leave.
  if (fakeClock) vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  render(
    <ToastProvider>
      <Buttons />
    </ToastProvider>
  );
}

const elapse = (ms: number) => act(() => vi.advanceTimersByTime(ms));

async function expectSlips(count: number) {
  vi.useRealTimers();
  await waitFor(() => expect(slips()).toHaveLength(count));
}

afterEach(() => vi.useRealTimers());

describe("toasts", () => {
  test("a success is announced politely and gets out of the way", async () => {
    setup({ fakeClock: true });
    click("ok");
    expect(screen.getByRole("status")).toHaveTextContent("Saved");
    expect(slips()).toHaveLength(1);

    elapse(3500);
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
    await expectSlips(0);
  });

  test("an error is announced assertively and stays long enough to read", async () => {
    setup({ fakeClock: true });
    click("fail");
    expect(screen.getByRole("alert")).toHaveTextContent("Couldn't save");

    elapse(3500);
    expect(screen.getByRole("alert")).toHaveTextContent("Couldn't save");
    elapse(3500);
    expect(screen.getByRole("alert")).toBeEmptyDOMElement();
    await expectSlips(0);
  });

  test("hovering pauses the timer, and a toast can be dismissed by hand", async () => {
    setup({ fakeClock: true });
    click("ok");
    const slip = slips()[0]!.parentElement!;
    fireEvent.pointerEnter(slip);
    elapse(10_000);
    expect(screen.getByRole("status")).toHaveTextContent("Saved");
    fireEvent.pointerLeave(slip);

    fireEvent.click(slips()[0]!);
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
    await expectSlips(0);
  });

  test("a repeat is one toast, and at most three show", async () => {
    setup();
    click("ok");
    click("ok");
    await expectSlips(1);

    for (const n of ["one", "two", "three", "four"]) click(n);
    await expectSlips(3);
    expect(screen.queryByText("one", { selector: "p" })).not.toBeInTheDocument();
  });

  test("asking for toasts outside the provider is a programming error", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<Buttons />)).toThrow(/within ToastProvider/);
  });
});
