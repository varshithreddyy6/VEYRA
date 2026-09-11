import { describe, expect, it } from "vitest";
import { DEMO_SAMPLES } from "@/lib/samples";

describe("demo transaction samples", () => {
  it("provides exactly V1–V28 feature keys with finite numbers for every sample", () => {
    expect(DEMO_SAMPLES.length).toBeGreaterThanOrEqual(2);
    for (const sample of DEMO_SAMPLES) {
      const keys = Object.keys(sample.features);
      expect(keys).toHaveLength(28);
      expect(keys[0]).toBe("V1");
      expect(keys[27]).toBe("V28");
      for (const v of Object.values(sample.features)) {
        expect(Number.isFinite(v)).toBe(true);
      }
      expect(sample.amount).toBeGreaterThan(0);
      expect(sample.externalRef.startsWith("DEMO-")).toBe(true);
    }
  });

  it("has a fraud-like and a low-risk sample for demonstration", () => {
    const ids = DEMO_SAMPLES.map((s) => s.id);
    expect(ids).toContain("fraud-like");
    expect(ids).toContain("clean-low-risk");
  });
});
