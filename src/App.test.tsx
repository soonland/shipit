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
    for (const step of ["Code", "Build", "Deploy", "Automate"]) {
      expect(screen.getByRole("heading", { name: step })).toBeInTheDocument();
    }
    expect(await screen.findByText("live · v2.0.0")).toBeInTheDocument();
    expect(await screen.findByText("shipit-00007-xyz")).toBeInTheDocument();
  });
});
