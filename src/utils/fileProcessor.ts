// utils/fileProcessor.ts
import fs from "fs";
import mammoth from "mammoth";
import { promisify } from "util";
import { exec } from "child_process";
import { PDFParse } from 'pdf-parse'; // ✅ Correct import for v2

const execAsync = promisify(exec);

export const extractTextFromFile = async (file: any): Promise<string> => {
    const filePath = file.path;
    const fileName = file.originalname;
    const extension = fileName.split(".").pop()?.toLowerCase() || "";

    try {
        let text = "";

        switch (extension) {
            case "pdf": {
                const dataBuffer = fs.readFileSync(filePath);
                // ✅ v2 usage: Create PDFParse instance with data
                const parser = new PDFParse({ data: dataBuffer });
                const result = await parser.getText();
                await parser.destroy(); // ✅ Always destroy to free memory
                text = result.text;
                break;
            }

            case "docx": {
                const result = await mammoth.extractRawText({ path: filePath });
                text = result.value;
                break;
            }

            case "doc": {
                try {
                    const { stdout } = await execAsync(
                        `antiword "${filePath}" 2>/dev/null || catdoc "${filePath}" 2>/dev/null || echo ""`
                    );
                    text = stdout;
                    if (!text || text.trim().length === 0) {
                        throw new Error("No text extracted from .doc file");
                    }
                } catch {
                    throw new Error(
                        "Unable to read .doc file. Please convert to .docx or PDF."
                    );
                }
                break;
            }

            case "txt":
            case "odt":
            case "rtf": {
                text = fs.readFileSync(filePath, "utf-8");
                break;
            }

            default:
                throw new Error(
                    `Unsupported file format: ${extension}. Please upload PDF, DOC, DOCX, TXT, ODT, or RTF.`
                );
        }

        text = text.replace(/\s+/g, " ").trim();

        if (text.length < 10) {
            throw new Error(
                "File appears to be empty or contains only images. Please upload a text-based document."
            );
        }

        return text;

    } catch (error: any) {
        console.error("File extraction error:", error);
        throw new Error(`Failed to extract text: ${error.message}`);
    }
};