import { describe, it, expect } from "vitest";
import productMapping, { getPDFFileInfoById, getPDFFileInfoBulk, getProductWithPDFInfo } from "src/services/payfast/product-mapping";
import toolkit, { getToolkitFileInfoById } from "src/services/payfast/user-product-mapping";

describe("product-mapping", () => {
  it("maps ids 1-8 to a .pdf url + filename", () => {
    for (let i = 1; i <= 8; i++) {
      const info = getPDFFileInfoById(String(i))!;
      expect(info.fileUrl).toMatch(/^\/uploads\/pdfs\/.+\.pdf$/);
      expect(info.fileName).toMatch(/\.pdf$/);
    }
  });
  it("returns null for an unknown id", () => expect(getPDFFileInfoById("999")).toBeNull());
  it("bulk falls back to a default file for unknown ids and keeps order", () => {
    const r = getPDFFileInfoBulk([{ productId: "1" }, { productId: "42" }]);
    expect(r[0].fileName).toBe("Media-Strategy-Playbook.pdf");
    expect(r[1]).toEqual({ fileUrl: "/uploads/pdfs/42-default.pdf", fileName: "Product-42.pdf" });
  });
  it("getProductWithPDFInfo uses mapped file for known ids", () => {
    expect(getProductWithPDFInfo("1", "Playbook")).toEqual({ productId: "1", title: "Playbook", fileUrl: "/uploads/pdfs/1-media-strategy-playbook.pdf", fileName: "Media-Strategy-Playbook.pdf" });
  });
  it("getProductWithPDFInfo falls back for unknown ids", () => {
    expect(getProductWithPDFInfo("77", "Foo")).toMatchObject({ fileUrl: "/uploads/pdfs/77-default.pdf", fileName: "Foo.pdf" });
    expect(getProductWithPDFInfo("77", "")).toMatchObject({ fileName: "Product.pdf" });
  });
  it("default export exposes the helpers", () => {
    expect(productMapping.getPDFFileInfoById).toBe(getPDFFileInfoById);
    expect(Object.keys(productMapping.PRODUCT_PDF_MAP)).toHaveLength(8);
  });
});

describe("user-product-mapping (toolkits)", () => {
  it("has 8 toolkits under /uploads/toolkits", () => {
    expect(Object.keys(toolkit.TOOLKIT_PDF_MAP)).toHaveLength(8);
    for (const v of Object.values(toolkit.TOOLKIT_PDF_MAP)) expect(v.fileUrl).toMatch(/^\/uploads\/toolkits\/.+\.pdf$/);
  });
  it("lookup hit / miss", () => {
    expect(getToolkitFileInfoById("1")?.fileName).toBe("Communications-Playbook.pdf");
    expect(getToolkitFileInfoById("0")).toBeNull();
  });
});
