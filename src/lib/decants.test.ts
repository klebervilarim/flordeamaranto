import { describe, expect, it } from "vitest";
import { countDecantVolumes, normalizeVolume } from "./decants";

describe("countDecantVolumes", () => {
  it("counts decants per volume and ignores other product types", () => {
    const counts = countDecantVolumes([
      { product_type: "decant", volume: "5ml" },
      { product_type: "decant", volume: "5 ml" },
      { product_type: "decant", volume: "5ML" },
      { product_type: "decant", volume: "10ml" },
      { product_type: "perfume", volume: "5ml" },
      { product_type: "decant", volume: null },
    ]);
    expect(counts).toEqual({ "5ml": 3, "10ml": 1 });
  });

  it("returns no counts when the catalog has no decants", () => {
    expect(countDecantVolumes([{ product_type: "perfume", volume: "100ml" }])).toEqual({});
  });

  it("normalizes bare numbers to millilitres", () => {
    expect(normalizeVolume("5")).toBe("5ml");
    expect(normalizeVolume(" 10 ML ")).toBe("10ml");
    expect(normalizeVolume("")).toBeUndefined();
  });
});
