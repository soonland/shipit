import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import Terminal from "./Terminal";
import { jsonResponse, routeFetch, system } from "../test/fixtures";

describe("Terminal", () => {
  it("prints the boot sequence, then heartbeats", async () => {
    let calls = 0;
    vi.spyOn(globalThis, "fetch").mockImplementation(
      routeFetch({
        "/api/system": () => jsonResponse(system({ requests: ++calls })),
      }),
    );
    render(<Terminal lineDelayMs={0} pollMs={10} />);

    expect(await screen.findByText(/region northamerica-northeast1/)).toBeInTheDocument();
    expect(screen.getByText("tail -f /var/log/shipit")).toBeInTheDocument();
    expect(await screen.findByText(/heartbeat · .* reqs 2 /)).toBeInTheDocument();
    expect(screen.getByRole("log")).toBeInTheDocument();
  });

  it("shows a warning and retries while the API is down", async () => {
    let up = false;
    vi.spyOn(globalThis, "fetch").mockImplementation(
      routeFetch({
        "/api/system": () => (up ? jsonResponse(system()) : new Response("", { status: 503 })),
      }),
    );
    render(<Terminal lineDelayMs={0} pollMs={10} />);

    expect(await screen.findByText(/GET \/api\/system failed/)).toBeInTheDocument();
    up = true;
    expect(await screen.findByText(/container started at/)).toBeInTheDocument();
  });

  it("keeps only the newest lines", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(
      routeFetch({ "/api/system": () => jsonResponse(system()) }),
    );
    const { container } = render(<Terminal lineDelayMs={1} pollMs={5} maxLines={4} />);
    await screen.findByText("tail -f /var/log/shipit");
    // 4 log lines + the prompt line
    expect(container.querySelectorAll(".log")).toHaveLength(5);
  });
});
