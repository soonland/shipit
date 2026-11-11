import { describe, expect, it } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";
import Pipeline from "./Pipeline";
import { stages } from "./stages";

describe("Pipeline", () => {
  it("shows the first stage and switches when another is clicked", () => {
    render(<Pipeline version="2.1.0" revision="shipit-00009-abc" />);

    const tabs = screen.getAllByRole("tab");
    expect(tabs).toHaveLength(stages.length);
    expect(tabs[0]).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel")).toHaveTextContent(stages[0].summary);

    fireEvent.click(screen.getByRole("tab", { name: /CI/ }));
    expect(screen.getByRole("tab", { name: /CI/ })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel")).toHaveTextContent("pnpm lint && pnpm typecheck");
  });

  it("simulates a release stage by stage, then reports the live version", () => {
    vi.useFakeTimers();
    try {
      render(<Pipeline version="2.1.0" revision="shipit-00009-abc" timeScale={0.1} />);
      const button = screen.getByRole("button", { name: /simulate a release/ });

      fireEvent.click(button);
      expect(button).toBeDisabled();
      expect(button).toHaveTextContent("running…");

      act(() => vi.advanceTimersByTime(10));
      expect(screen.getByRole("tabpanel")).toHaveTextContent("running");

      act(() => vi.advanceTimersByTime(140)); // Commit (120ms) done, CI running
      expect(screen.getByRole("tab", { name: /CI/ })).toHaveAttribute("aria-selected", "true");
      expect(screen.getByRole("tab", { name: /Commit/ })).toHaveClass("stage-done");

      act(() => vi.advanceTimersByTime(stages.reduce((t, s) => t + s.simMs, 0) * 0.1));
      expect(screen.getByRole("status")).toHaveTextContent(
        "pipeline passed · v2.1.0 live · revision shipit-00009-abc",
      );
      expect(screen.getAllByRole("tab").every((t) => t.classList.contains("stage-done"))).toBe(true);
      expect(screen.getByRole("tabpanel")).toHaveTextContent("passed · ~2s");

      const again = screen.getByRole("button", { name: /run again/ });
      fireEvent.click(again);
      expect(screen.queryByRole("status")).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("shows the typical duration before running", () => {
    render(<Pipeline version="2.1.0" revision="r" />);
    expect(screen.getByRole("tabpanel")).toHaveTextContent("~1s");
  });
});
