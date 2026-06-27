import { describe, expect, it } from "vitest";
import {
  generalResearchAgentDraftFields,
  generalResearchAgentLimits,
  type RunLimits,
  validateAgentDraft,
  validateLimits,
} from "../src/agent.js";

describe("Agent limits", () => {
  it("accepts limits within every platform maximum", () => {
    const limits: RunLimits = generalResearchAgentLimits();

    expect(validateLimits(limits)).toEqual({ ok: true });
  });

  it("rejects limits above a platform maximum with an actionable error", () => {
    const result = validateLimits({
      modelTurns: 25,
      tavilySearches: 10,
      pageFetches: 30,
      activeMinutes: 15,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toEqual([
      {
        field: "modelTurns",
        provided: 25,
        maximum: 20,
      },
    ]);
  });

  it("rejects non-positive limits", () => {
    const result = validateLimits({
      modelTurns: 0,
      tavilySearches: -1,
      pageFetches: 30,
      activeMinutes: 15,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toEqual(
      expect.arrayContaining([
        { field: "modelTurns", provided: 0, maximum: 20 },
        { field: "tavilySearches", provided: -1, maximum: 10 },
      ]),
    );
  });

  it("rejects non-integer limits with an actionable error", () => {
    const result = validateLimits({
      modelTurns: 2.5,
      tavilySearches: 10,
      pageFetches: 30,
      activeMinutes: 15,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toContainEqual({
      field: "modelTurns",
      provided: 2.5,
      maximum: 20,
    });
  });
});

describe("Agent Draft validation", () => {
  it("accepts the seeded general research draft", () => {
    expect(validateAgentDraft(generalResearchAgentDraftFields())).toEqual({
      ok: true,
    });
  });

  it("rejects empty guided fields with a per-field actionable error", () => {
    const result = validateAgentDraft({
      purpose: " ",
      instructions: "",
      researchMethod: "fine",
      reportRequirements: "fine",
      limits: generalResearchAgentLimits(),
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toEqual(
      expect.arrayContaining([
        { field: "purpose", message: "must not be empty" },
        { field: "instructions", message: "must not be empty" },
      ]),
    );
  });

  it("includes limit violations with the limits.* field name", () => {
    const result = validateAgentDraft({
      ...generalResearchAgentDraftFields(),
      limits: { ...generalResearchAgentLimits(), pageFetches: 99 },
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toContainEqual({
      field: "limits.pageFetches",
      message: expect.stringContaining("no greater than 30"),
    });
  });
});
