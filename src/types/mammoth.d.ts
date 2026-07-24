// src/types/mammoth.d.ts
declare module 'mammoth' {
  export function extractRawText(options: { path: string }): Promise<{ value: string }>;
  export function convertToHtml(options: { path: string }): Promise<{ value: string }>;
  export function extractRawText(options: { buffer: Buffer }): Promise<{ value: string }>;
}