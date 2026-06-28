import { describe, expect, it } from "vitest";
import { createCredentialHint } from "../src/credential.js";

describe("createCredentialHint", () => {
  it("masks all but the last 4 characters", () => {
    expect(createCredentialHint("sk-minimax-key-7H2K")).toBe("•••• 7H2K");
  });

  it("returns full secret when shorter than 4 characters", () => {
    expect(createCredentialHint("ab")).toBe("•••• ab");
  });

  it("handles empty string", () => {
    expect(createCredentialHint("")).toBe("•••• ");
  });
});
