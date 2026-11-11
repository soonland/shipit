import { describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useRuntimeInfo } from "./useRuntimeInfo";

const live = { version: "9.9.9", revision: "shipit-00042-abc", started: "2026-01-01 00:00:00 UTC" };

describe("useRuntimeInfo", () => {
  it("returns the fallback before the API answers", () => {
    vi.spyOn(globalThis, "fetch").mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useRuntimeInfo());
    expect(result.current).toEqual({ version: "dev", revision: "local", started: "—", preview: null });
  });

  it("uses the data from /api/info", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(JSON.stringify(live), { status: 200 }));
    const { result } = renderHook(() => useRuntimeInfo());
    await waitFor(() => expect(result.current).toEqual(live));
    expect(fetchMock).toHaveBeenCalledWith("/api/info", expect.anything());
  });

  it("keeps the fallback when the API fails", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("", { status: 500 }));
    const { result } = renderHook(() => useRuntimeInfo());
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(result.current.revision).toBe("local");
  });
});
