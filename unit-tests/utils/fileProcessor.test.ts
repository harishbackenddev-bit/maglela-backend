import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";

const { extractRawText, getText, destroy, PDFParse } = vi.hoisted(() => {
  const extractRawText = vi.fn();
  const getText = vi.fn();
  const destroy = vi.fn();

  const PDFParse = vi.fn().mockImplementation(function () {
    return {
      getText,
      destroy,
    };
  });

  return {
    extractRawText,
    getText,
    destroy,
    PDFParse,
  };
});

vi.mock("mammoth", () => ({
  default: {
    extractRawText,
  },
}));

vi.mock("pdf-parse", () => ({
  PDFParse,
}));

import { extractTextFromFile } from "src/utils/fileProcessor";

let dir: string;

beforeAll(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "fp-"));
});

afterAll(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

const write = (name: string, content: string) => {
  const p = path.join(dir, name);
  fs.writeFileSync(p, content);
  return p;
};

describe("extractTextFromFile", () => {
  it("reads .txt and collapses whitespace", async () => {
    const p = write("a.txt", "Hello   world\n\nthis is   a   test");

    expect(
      await extractTextFromFile({
        path: p,
        originalname: "a.txt",
      })
    ).toBe("Hello world this is a test");
  });

  it.each(["rtf", "odt"])("reads .%s as plain text", async (ext) => {
    const p = write(`a.${ext}`, "some long enough content here");

    expect(
      await extractTextFromFile({
        path: p,
        originalname: `a.${ext}`,
      })
    ).toBe("some long enough content here");
  });

  it("is case-insensitive on the extension", async () => {
    const p = write("b.TXT", "uppercase extension works");

    expect(
      await extractTextFromFile({
        path: p,
        originalname: "b.TXT",
      })
    ).toBe("uppercase extension works");
  });

  it("extracts text from docx via mammoth", async () => {
    extractRawText.mockResolvedValue({
      value: "docx   body text here",
    });

    expect(
      await extractTextFromFile({
        path: "/x.docx",
        originalname: "x.docx",
      })
    ).toBe("docx body text here");

    expect(extractRawText).toHaveBeenCalledWith({
      path: "/x.docx",
    });
  });

  it("extracts text from pdf and always destroys the parser", async () => {
    getText.mockResolvedValue({
      text: "pdf content that is long enough",
    });

    const p = write("x.pdf", "%PDF");

    expect(
      await extractTextFromFile({
        path: p,
        originalname: "x.pdf",
      })
    ).toBe("pdf content that is long enough");

    expect(destroy).toHaveBeenCalled();
  });

  it("rejects unsupported formats with a helpful message", async () => {
    await expect(
      extractTextFromFile({
        path: "/x.png",
        originalname: "x.png",
      })
    ).rejects.toThrow(/Unsupported file format: png/);
  });

  it("rejects files with (almost) no text", async () => {
    const p = write("empty.txt", "  hi  ");

    await expect(
      extractTextFromFile({
        path: p,
        originalname: "empty.txt",
      })
    ).rejects.toThrow(/empty or contains only images/);
  });

  it("wraps read errors", async () => {
    await expect(
      extractTextFromFile({
        path: path.join(dir, "missing.txt"),
        originalname: "missing.txt",
      })
    ).rejects.toThrow(/Failed to extract text/);
  });
});