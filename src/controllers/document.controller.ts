import { Request, Response } from "express";
import { ApiError } from "../utils/ApiError.ts";
import { ApiResponse } from "../utils/ApiResponse.ts";
import { asyncHandler } from "../utils/asyncHandler.ts";
import { createDocumentSchema, updateDocumentSchema, documentSearchSchema } from "../validators/document.validSchema.ts";
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

        await documentService.uploadDocument({
            ...parsed.data,
            filePath: relativeFilePath,
            uploadedBy: typedReq.user.id,
        });

        return res
            .status(201)
            .json(new ApiResponse(201, {}, "Document uploaded successfully"));
    }
);

export const getDocumentslist = asyncHandler(
    async (req: Request, res: Response) => {
        const documentsList = await documentService.getAllDocuments();

        if (documentsList.length === 0) throw new ApiError(500, "No Documents found.");

        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    { documentsList },
                    "Successfully fetched documents list from the Document Table"
                )
            );
    }
);

export const getSpecificDocument = asyncHandler(
    async (req: Request, res: Response) => {
        const documentID = req.params.id;

        if (!documentID) throw new ApiError(400, "Document ID is missing");

        const document = await documentService.getDocumentById(documentID);

        if (!document) throw new ApiError(404, "Document with the given ID was not found");

        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    { document },
                    "Successfully fetched the document with given ID."
                )
            );
    }
);

export const deleteDocument = asyncHandler(
    async (req: Request, res: Response) => {
        const documentID = req.params.id;

        if (!documentID) throw new ApiError(400, "Document ID is missing");

        const deletedDocument = await documentService.deleteDocument(documentID);

        if (!deletedDocument) throw new ApiError(404, "Document not found");

        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    { deletedDocument },
                    "Document with given id successfully deleted."
                )
            );
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

        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    { updatedDocument: updated },
                    "Document updated successfully"
                )
            );
    }
);

export const generateDownloadLink = asyncHandler(
    async (req: Request, res: Response) => {
        const documentID = req.params.id;
        if (!documentID) throw new ApiError(400, "Document ID is required");

        const downloadUrl = await documentService.generateDownloadLink(documentID);

        return res
            .status(200)
            .json(
                new ApiResponse(200, { downloadUrl }, "Download link generated")
            );
    }
);


export const streamDocumentFromToken = asyncHandler(async (req, res) => {
    const token = req.params.token;

    if (!token) {
        throw new ApiError(400, "Missing download token");
    }

    let decoded;
    try {
        decoded = jwt.verify(token, process.env.DOWNLOAD_TOKEN_SECRET!);
    } catch (error) {
        throw new ApiError(401, "Invalid or expired download token");
    }

    const documentID = (decoded as any).documentID;

    const { path: filePath, filename } = await documentService.streamDocument(documentID);

    res.setHeader("Content-Type", "application/octet-stream");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
});


export const searchDocuments = asyncHandler(async (req, res) => {
    const parsed = documentSearchSchema.safeParse(req.query);

    if (!parsed.success) {
        throw new ApiError(400, "Invalid search params", parsed.error.errors);
    }

    const results = await documentService.searchDocuments(parsed.data);
    return res
        .status(200)
        .json(new ApiResponse(200, results, "Filtered documents fetched"));
});
