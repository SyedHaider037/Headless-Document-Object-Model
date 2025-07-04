import { z } from "zod"

export const createDocumentSchema = z.object({
    title: z.string().min(8, "Title should be al least 8 characters long"),
    description: z.string().optional(),
    metadata: z.record(z.any()).optional(),
    tag: z.string().min(5,"Tag is required"),
});

export const updateDocumentSchema = z.object({
    title: z.string().min(8, "Title should be al least 8 characters long").optional(),
    description: z.string().optional(),
    metadata: z.record(z.any()).optional(),
    tag: z.string().min(5,"Tag is required").optional(),
});      

export const documentSearchSchema = z.object({
    tag: z.string().optional(),
    uploadedBy: z.string().uuid().optional(),
    metaKey: z.string().optional(),
    metaValue: z.string().optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
});