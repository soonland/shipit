import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import LockButton from "./LockButton";
import { getKey, setKey } from "./client";
import { jsonResponse } from "../test/fixtures";

afterEach(() => setKey(null));

const unlockWith = async (code: string) => {
  fireEvent.click(screen.getByRole("button", { name: "Unlock chaos mode" }));
  fireEvent.change(screen.getByLabelText("Secret code"), { target: { value: code } });
  fireEvent.click(screen.getByRole("button", { name: "unlock" }));
};

describe("LockButton", () => {
  it("unlocks with the right code and locks again on click", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse({ ok: true }));
    render(<LockButton />);
    await unlockWith("my-secret-code");

    expect(await screen.findByRole("button", { name: /Chaos mode unlocked/ })).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(getKey()).toBe("my-secret-code");
    const [, init] = fetchSpy.mock.calls[0];
    expect((init?.headers as Record<string, string>)["x-chaos-key"]).toBe("my-secret-code");

    fireEvent.click(screen.getByRole("button", { name: /Chaos mode unlocked/ }));
    expect(getKey()).toBeNull();
    expect(screen.getByRole("button", { name: "Unlock chaos mode" })).toBeInTheDocument();
  });

  it.each([
    [401, "Wrong code."],
    [404, "Chaos mode is not enabled on this server."],
    [429, "Too many attempts. Wait a minute."],
  ])("explains a %i answer", async (status, message) => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse({}, status));
    render(<LockButton />);
    await unlockWith("whatever-code");
    expect(await screen.findByRole("alert")).toHaveTextContent(message);
    expect(getKey()).toBeNull();
  });

  it("explains when the server is unreachable", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("offline"));
    render(<LockButton />);
    await unlockWith("whatever-code");
    expect(await screen.findByRole("alert")).toHaveTextContent("Server unreachable");
  });

  it("closes with Cancel, Escape or a click outside", () => {
    render(<LockButton />);
    const open = () => fireEvent.click(screen.getByRole("button", { name: "Unlock chaos mode" }));

    open();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    open();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    open();
    fireEvent.click(screen.getByRole("dialog").parentElement!);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("keeps the unlock button disabled until a code is typed", () => {
    render(<LockButton />);
    fireEvent.click(screen.getByRole("button", { name: "Unlock chaos mode" }));
    expect(screen.getByRole("button", { name: "unlock" })).toBeDisabled();
  });
});
