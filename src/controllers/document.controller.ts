import { matchRes } from "@carbonteq/fp";
import { Request, Response } from "express";
import { ApiError } from "../utils/ApiError.ts";
import { ApiResponse } from "../utils/ApiResponse.ts";
import { asyncHandler } from "../utils/asyncHandler.ts";
import { createDocumentSchema, updateDocumentSchema, documentSearchWithPaginationSchema, paginationSchema } from "../validators/document.validSchema.ts";
import { users } from "../schemas/user.schema.ts";
import jwt from "jsonwebtoken";
import path from "path";
import fs from "fs";
import { DocumentService } from "../services/document.service.ts";
import { container } from "tsyringe";

interface RequestWithUser extends Request {
    user: typeof users.$inferSelect & { role?: "ADMIN" | "USER" };
}

const documentService = container.resolve(DocumentService)

export const createDocument = asyncHandler(
    async (req: Request, res: Response) => {
        const typedReq = req as RequestWithUser;

        const parsed = createDocumentSchema.safeParse(req.body);

        if (!parsed.success) throw new ApiError(400, "Invalid input", parsed.error.errors);

        const file = req.file;
        if (!file?.path) throw new ApiError(400, "No file uploaded, File path is missing");

        const relativeFilePath = path.join("public", "temp", file.originalname);

        const result = await documentService.uploadDocument({
            ...parsed.data,
            filePath: relativeFilePath,
            uploadedBy: typedReq.user.id,
        });

        return matchRes(result, {
            Ok: () => res.status(201).json(new ApiResponse(201, {}, "Document uploaded successfully")),
            Err: (err) => res.status(500).json(new ApiResponse(500, null, err)),
        });
    }
);

export const getDocumentslist = asyncHandler(
    async (req: Request, res: Response) => {

        const parsed = paginationSchema.safeParse(req.query)

        if (!parsed.success) {
            throw new ApiError(400, "Invalid pagination input", parsed.error.errors);
        }

        const { page, limit } = parsed.data;

        const documentsList = await documentService.getAllDocuments(page, limit);

        return matchRes(documentsList, {
            Ok: ({data, total}) =>
                res.status(200).json(new ApiResponse(200, { documents: data, total }, "Successfully fetched documents list.")),
            Err: (err) => res.status(500).json(new ApiResponse(500, null, err)),
        });
    }
);

export const getSpecificDocument = asyncHandler(
    async (req: Request, res: Response) => {
        const documentID = req.params.id;

        if (!documentID) throw new ApiError(400, "Document ID is missing");

        const document = await documentService.getDocumentById(documentID);


        return matchRes(document, {
            Ok: (doc) =>
                res.status(200).json(new ApiResponse(200, { document: doc }, "Document found")),
            Err: (err) =>
                res.status(404).json(new ApiResponse(404, null, err)),
        });
    }
);

export const deleteDocument = asyncHandler(
    async (req: Request, res: Response) => {
        const documentID = req.params.id;

        if (!documentID) throw new ApiError(400, "Document ID is missing");

        const deletedDoc = await documentService.deleteDocument(documentID);

        return matchRes(deletedDoc, {
            Ok: () => res.status(200).json(new ApiResponse(200, null, "Document deleted successfully")),
            Err: (err) => {
                const code = err.includes("not found") ? 404 : 500;
                return res.status(code).json(new ApiResponse(code, null, err));
            },
        });
    }
);

export const updateDocument = asyncHandler(
    async (req: Request, res: Response) => {
        const documentId = req.params.id;

        if (!documentId) throw new ApiError(400, "Document ID is missing");

        const parsed = updateDocumentSchema.safeParse(req.body);
        if (!parsed.success)
            throw new ApiError(400, "Invalid input", parsed.error.errors);

        const updated = await documentService.updateDocument(documentId, parsed.data);

        return matchRes(updated, {
            Ok: () => res.status(200).json(new ApiResponse(200, null, "Document updated successfully")),
            Err: (err) => {
                const code = err.includes("not found") ? 404 : 400;
                return res.status(code).json(new ApiResponse(code, null, err));
            },
        });
    }
);

export const generateDownloadLink = asyncHandler( 
    async (req: Request, res: Response) => {
        const documentID = req.params.id;
    
        if (!documentID) throw new ApiError(400, "Document ID is required");
        const downloadUrl = await documentService.generateDownloadLink(documentID);
    
        return matchRes(downloadUrl, {
            Ok: (url) =>
                res.status(200).json(new ApiResponse(200, { downloadUrl: url }, "Download link generated")),
            Err: (err) => res.status(404).json(new ApiResponse(404, null, err)),
        });
    }
);


export const streamDocumentFromToken = asyncHandler(
    async (req: Request, res: Response) => {
        const token = req.params.token;
    
        if (!token) throw new ApiError(400, "Missing download token");
    
        let decoded;
        try {
            decoded = jwt.verify(token, process.env.DOWNLOAD_TOKEN_SECRET!);
        } catch (error) {
            throw new ApiError(401, "Invalid or expired download token");
        }
    
        const documentID = (decoded as any).documentID;
    
        const result = await documentService.streamDocument(documentID);
    
        return matchRes(result, {
            Ok: ({ path: filePath, filename }) => {
                res.setHeader("Content-Type", "application/octet-stream");
                res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
                const fileStream = fs.createReadStream(filePath);
                fileStream.pipe(res);
            },
            Err: (err) => res.status(404).json(new ApiResponse(404, null, err)),
        });    
    }
);


export const searchDocuments = asyncHandler(
    async (req: Request, res: Response) => {
        const parsed = documentSearchWithPaginationSchema.safeParse(req.query);
    
        if (!parsed.success) {
            throw new ApiError(400, "Invalid search params", parsed.error.errors);
        }
    
        const { page, limit, ...searchFields } = parsed.data;
    
        const results = await documentService.searchDocuments(searchFields, page, limit);
    
        return matchRes(results, {
            Ok: ({ data, total}) =>
                res.status(200).json(new ApiResponse(200, { results: data, total }, "Documents found")),
            Err: (err) => res.status(500).json(new ApiResponse(500, null, err)),
        });
    }
);
