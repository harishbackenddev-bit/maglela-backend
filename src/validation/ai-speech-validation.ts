
import { z } from "zod";

export const aiSpeechGenerateSchema = z.object({
    
    title: z.string().min(3, "Title must be at least 3 characters"),
    
    
    authority: z.string().or(z.number()).optional().default("0"),
    clarity: z.string().or(z.number()).optional().default("0"),
    academicRigor: z.string().or(z.number()).optional().default("0"),
    accessibility: z.string().or(z.number()).optional().default("0"),
    narrativeDepth: z.string().or(z.number()).optional().default("0"),
    
    
    file: z.any().optional(), 
    audio: z.string().optional(), 
    recordingDuration: z.string().or(z.number()).optional(), 
});

export const audioTranscriptionSchema = z.object({
    file: z.any().refine((file) => file, "Audio file is required"),
    language: z.string().optional().default("en"),
});