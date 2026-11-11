import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import App from "./App";

describe("App", () => {
  it("renders the hero, the pipeline and live runtime info", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({ version: "2.0.0", revision: "shipit-00007-xyz", started: "now" }),
        { status: 200 },
      ),
    );
    render(<App />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("From laptop");
    for (const step of ["Code", "Build", "Deploy", "Automate"]) {
      expect(screen.getByRole("heading", { name: step })).toBeInTheDocument();
    }
    expect(await screen.findByText("live · v2.0.0")).toBeInTheDocument();
    expect(screen.getAllByText("shipit-00007-xyz")).toHaveLength(2);
  });
});
