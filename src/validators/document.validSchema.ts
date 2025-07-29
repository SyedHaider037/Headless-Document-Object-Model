import { z } from "zod"

export const createDocumentSchema = z.object({
    title: z.string().min(8, "Title should be al least 8 characters long"),
    description: z.string().optional(),
    tag: z.string().min(5,"Tag is required"),
    
});

export const updateDocumentSchema = z.object({
    title: z.string().min(8, "Title should be al least 8 characters long").optional(),
    description: z.string().optional(),
    tag: z.string().min(5,"Tag is required").optional(),
});      

export const documentSearchSchema = z.object({
    title: z.string().optional(),
    tag: z.string().optional(),
    uploadedBy: z.string().uuid().optional(),
});

export const paginationSchema = z.object({
    page: z.string().optional().transform((val) => parseInt(val ?? "1")),
    limit: z.string().optional().transform((val) => parseInt(val ?? "5")),
});

export const documentSearchWithPaginationSchema = documentSearchSchema.merge(paginationSchema).strict();