import { afterEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import Terminal from "./Terminal";
import { jsonResponse, routeFetch, system } from "../test/fixtures";

let hidden = false;
Object.defineProperty(document, "hidden", { configurable: true, get: () => hidden });
const setHidden = (value: boolean) =>
  act(() => {
    hidden = value;
    document.dispatchEvent(new Event("visibilitychange"));
  });

afterEach(() => {
  hidden = false;
});

const serveSystem = () => {
  let calls = 0;
  const spy = vi
    .spyOn(globalThis, "fetch")
    .mockImplementation(routeFetch({ "/api/system": () => jsonResponse(system({ requests: ++calls })) }));
  return spy;
};

describe("Terminal", () => {
  it("prints the boot sequence, then heartbeats", async () => {
    serveSystem();
    render(<Terminal lineDelayMs={0} pollMs={10} stopAfterMs={60_000} />);

    expect(await screen.findByText(/region northamerica-northeast1/)).toBeInTheDocument();
    expect(screen.getByText("tail -f /var/log/shipit")).toBeInTheDocument();
    expect(await screen.findByText(/heartbeat · .* reqs 2 /)).toBeInTheDocument();
  });

  it("shows a warning and retries while the API is down", async () => {
    let up = false;
    vi.spyOn(globalThis, "fetch").mockImplementation(
      routeFetch({
        "/api/system": () => (up ? jsonResponse(system()) : new Response("", { status: 503 })),
      }),
    );
    render(<Terminal lineDelayMs={0} pollMs={10} stopAfterMs={60_000} />);

    expect(await screen.findByText(/GET \/api\/system failed/)).toBeInTheDocument();
    up = true;
    expect(await screen.findByText(/container started at/)).toBeInTheDocument();
  });

  it("stops after the time limit and can be resumed", async () => {
    const fetchSpy = serveSystem();
    render(<Terminal lineDelayMs={0} pollMs={10} stopAfterMs={30} />);

    const resume = await screen.findByRole("button", { name: /resume tail/ });
    expect(screen.getByText("tail stopped after 0s to save requests")).toBeInTheDocument();
    const callsWhenStopped = fetchSpy.mock.calls.length;
    await new Promise((r) => setTimeout(r, 40));
    expect(fetchSpy.mock.calls.length).toBe(callsWhenStopped); // no requests while stopped

    fireEvent.click(resume);
    expect(screen.queryByRole("button", { name: /resume tail/ })).not.toBeInTheDocument();
    expect(screen.getAllByText("tail -f /var/log/shipit")).toHaveLength(2);
    await screen.findByRole("button", { name: /resume tail/ });
    expect(fetchSpy.mock.calls.length).toBeGreaterThan(callsWhenStopped);
  });

  it("pauses while the tab is hidden", async () => {
    const fetchSpy = serveSystem();
    render(<Terminal lineDelayMs={0} pollMs={10} stopAfterMs={60_000} />);
    await screen.findByText("tail -f /var/log/shipit");

    setHidden(true);
    expect(await screen.findByText("tab hidden · tail paused")).toBeInTheDocument();
    const callsWhileHidden = fetchSpy.mock.calls.length;
    await new Promise((r) => setTimeout(r, 40));
    expect(fetchSpy.mock.calls.length).toBe(callsWhileHidden);

    setHidden(false);
    expect(await screen.findByText("tab visible · tail resumed")).toBeInTheDocument();
    await vi.waitFor(() => expect(fetchSpy.mock.calls.length).toBeGreaterThan(callsWhileHidden));
  });

  it("waits for the tab to be visible before booting", async () => {
    hidden = true;
    const fetchSpy = serveSystem();
    render(<Terminal lineDelayMs={0} pollMs={10} stopAfterMs={60_000} />);
    await new Promise((r) => setTimeout(r, 30));
    expect(fetchSpy).not.toHaveBeenCalled();

    setHidden(false);
    expect(await screen.findByText(/container started at/)).toBeInTheDocument();
  });

  it("keeps only the newest lines", async () => {
    serveSystem();
    const { container } = render(
      <Terminal lineDelayMs={1} pollMs={5} stopAfterMs={60_000} maxLines={4} />,
    );
    await screen.findByText("tail -f /var/log/shipit");
    expect(container.querySelectorAll(".log")).toHaveLength(5); // 4 lines + prompt
  });
});

describe("Terminal prompt", () => {
  it("runs typed commands, keeps history and clears", async () => {
    serveSystem();
    render(<Terminal lineDelayMs={0} pollMs={60_000} stopAfterMs={60_000} />);
    await screen.findByText("tail -f /var/log/shipit");
    const input = screen.getByLabelText("Terminal command");

    fireEvent.change(input, { target: { value: "help" } });
    fireEvent.submit(input.closest("form")!);
    expect(await screen.findByText(/chaos crash/)).toBeInTheDocument();
    expect(screen.getByText("help")).toBeInTheDocument(); // echoed command

    fireEvent.keyDown(input, { key: "ArrowUp" });
    expect(input).toHaveValue("help");
    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(input).toHaveValue("");
    fireEvent.keyDown(input, { key: "a" });

    fireEvent.change(input, { target: { value: "clear" } });
    fireEvent.submit(input.closest("form")!);
    await vi.waitFor(() => expect(screen.queryByText(/chaos crash/)).not.toBeInTheDocument());
  });

  it("ignores an empty submit and resumes a stopped tail with the tail command", async () => {
    serveSystem();
    render(<Terminal lineDelayMs={0} pollMs={10} stopAfterMs={30} />);
    await screen.findByRole("button", { name: /resume tail/ });
    const input = screen.getByLabelText("Terminal command");

    fireEvent.submit(input.closest("form")!);
    fireEvent.change(input, { target: { value: "tail" } });
    fireEvent.submit(input.closest("form")!);
    await vi.waitFor(() =>
      expect(screen.queryByRole("button", { name: /resume tail/ })).not.toBeInTheDocument(),
    );
  });
});

describe("Terminal status bar", () => {
  it("shows the lock, the tail state and the chaos state", async () => {
    serveSystem();
    render(<Terminal lineDelayMs={0} pollMs={10} stopAfterMs={30} />);
    expect(screen.getByRole("button", { name: "Unlock chaos mode" })).toBeInTheDocument();
    expect(screen.getByText("chaos: locked")).toBeInTheDocument();
    expect(screen.getByText(/tail live/)).toBeInTheDocument();
    expect(await screen.findByText("tail stopped")).toBeInTheDocument();
  });
});
