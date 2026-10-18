import { describe, expect, it } from "vitest";
import { countDecantVolumes, normalizeVolume } from "./decants";

describe("countDecantVolumes", () => {
  it("counts decants per volume and ignores other product types", () => {
    const counts = countDecantVolumes([
      { product_type: "decant", volume: "5ml", image_url: "a.jpg" },
      { product_type: "decant", volume: "5 ml", image_url: "b.jpg" },
      { product_type: "decant", volume: "5ML", image_url: "c.jpg" },
      { product_type: "decant", volume: "10ml", image_url: "d.jpg" },
      { product_type: "perfume", volume: "5ml", image_url: "e.jpg" },
      { product_type: "decant", volume: null, image_url: "f.jpg" },
    ]);
    expect(counts).toEqual({ "5ml": 3, "10ml": 1 });
  });

  it("excludes decants without a photo, which the catalog keeps hidden", () => {
    expect(
      countDecantVolumes([
        { product_type: "decant", volume: "5ml", image_url: null },
        { product_type: "decant", volume: "5ml", image_url: "" },
        { product_type: "decant", volume: "10ml", image_url: "ok.jpg" },
      ]),
    ).toEqual({ "10ml": 1 });
  });

  it("returns no counts when the catalog has no decants", () => {
    expect(
      countDecantVolumes([{ product_type: "perfume", volume: "100ml", image_url: "x.jpg" }]),
    ).toEqual({});
  });

  it("normalizes bare numbers to millilitres", () => {
    expect(normalizeVolume("5")).toBe("5ml");
    expect(normalizeVolume(" 10 ML ")).toBe("10ml");
    expect(normalizeVolume("")).toBeUndefined();
  });
});
