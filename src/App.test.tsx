import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import App from "./App";
import { jsonResponse, routeFetch, system } from "./test/fixtures";

describe("App", () => {
  it("renders the hero, the live terminal, the pipeline and runtime info", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(
      routeFetch({
        "/api/info": () =>
          jsonResponse({ version: "2.0.0", revision: "shipit-00007-xyz", started: "now" }),
        "/api/system": () => jsonResponse(system()),
      }),
    );
    render(<App />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("From laptop");
    expect(screen.getByRole("log", { name: "Live server logs" })).toBeInTheDocument();
    expect(screen.getByRole("tablist", { name: "Pipeline stages" })).toBeInTheDocument();
    expect(await screen.findByText("live · v2.0.0")).toBeInTheDocument();
    expect(await screen.findByText("shipit-00007-xyz")).toBeInTheDocument();
  });
});

describe("App preview badge", () => {
  it("shows the PR number instead of the version on a preview deployment", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(
      routeFetch({
        "/api/info": () =>
          jsonResponse({ version: "2.3.1", revision: "shipit-00042-pr", started: "now", preview: 16 }),
        "/api/system": () => jsonResponse(system()),
      }),
    );
    render(<App />);
    expect(await screen.findByText("preview · PR #16")).toBeInTheDocument();
    expect(screen.queryByText(/live · v/)).not.toBeInTheDocument();
  });
});
