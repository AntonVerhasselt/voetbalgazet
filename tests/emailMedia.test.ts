import { describe, expect, it } from "vitest";
import { extractEmailMediaR2Keys } from "../convex/lib/emailMedia";

describe("extractEmailMediaR2Keys", () => {
  it("extracts media CDN URLs and explicit r2 keys once", () => {
    const html = [
      '<img src="https://media.devoetbalgazet.be/newsletters%2Fhero.jpg" />',
      '<img src="https://media.devoetbalgazet.be/folder/image%20one.webp?width=640" />',
      '<span data-r2-key="manual/key.png"></span>',
      '<img src="https://example.com/ignored.jpg" />',
      '<img src="https://media.devoetbalgazet.be/newsletters%2Fhero.jpg" />',
    ].join("");

    expect(extractEmailMediaR2Keys(html).sort()).toEqual([
      "folder/image one.webp",
      "manual/key.png",
      "newsletters/hero.jpg",
    ]);
  });
});
