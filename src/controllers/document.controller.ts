import { Request, Response } from "express";
import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";
import { asyncHandler } from "../utils/asyncHandler";
import { db } from "../db/index.ts";
import { documents } from "../schemas/documents.schema.ts";
import {
    createDocumentSchema,
    updateDocumentSchema,
    documentSearchSchema,
} from "../validators/document.validSchema.ts";
// import { uploadOnCloudinary } from "../utils/cloudinary.ts";
import { users } from "../schemas/user.schema.ts";
import { eq, or, like, gte, lte } from "drizzle-orm";
import jwt from "jsonwebtoken";
// import axios from "axios";
import path from "path";
import fs from "fs";
import { log } from "console";

interface RequestWithUser extends Request {
    user: typeof users.$inferSelect  & { role?: "ADMIN" | "USER" };
}


export const createDocument = asyncHandler(
    async (req: Request, res: Response) => {
        const typedReq = req as RequestWithUser;

        const parsed = createDocumentSchema.safeParse(req.body);

        if (!parsed.success) {
            throw new ApiError(400, "Invalid input", parsed.error.errors);
        }
        console.log(req);
        
        const file = req.file;
        if (!file?.path) {
            throw new ApiError(400, "No file uploaded, File path is missing");
        }

        const { title, description, tag } = parsed.data;

        const relativeFilePath = path.join("public", "temp", file.originalname);

        // const uploadedFile = await uploadOnCloudinary(file.path);
        // if (!uploadedFile?.secure_url) {
        //     throw new ApiError(500, "File upload failed");
        // }

        await db.insert(documents).values({
            title,
            description,
            tag,
            filepath: relativeFilePath,
            uploadedBy: typedReq.user.id,
        });

        return res
            .status(201)
            .json(new ApiResponse(201, {}, "Document uploaded successfully"));
    }
);



export const getDocumentslist = asyncHandler(
    async (req: Request, res: Response) => {
        const documentslist = await db.select().from(documents);

        if (documentslist.length === 0) {
            throw new ApiError(500, "No Documents found.");
        }

        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    { documentslist },
                    "Successfully fetched documents list from the Document Table"
                )
            );
    }
);



export const getSpecificDocument = asyncHandler(
    async (req: Request, res: Response) => {
        const documentID = req.params.id;

        if (!documentID) {
            throw new ApiError(400, "Document ID is missing");
        }

        const [document] = await db
            .select()
            .from(documents)
            .where(eq(documents.id, documentID));

        if (!document) {
            throw new ApiError(404, "Document with the given ID was not found");
        }

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

        const [document] = await db
            .select()
            .from(documents)
            .where(eq(documents.id, documentID));

        if (!document) {
            throw new ApiError(404, "Document not found");
        }

        const [documentdeleted] = await db
            .delete(documents)
            .where(eq(documents.id, documentID))
            .returning();

        const filePath = path.join(process.cwd(), document.filepath);

        try {
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath); 
                console.log(" File deleted:", filePath);
                }
        } catch (err) {
            console.error("Failed to delete file:", err);
        }    

        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    { documentdeleted },
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
        if (!parsed.success) throw new ApiError(400, "Invalid input", parsed.error.errors);

        const dataToBeUpdated = parsed.data;

        const [updateDoc] = await db
            .update(documents)
            .set({
                ...dataToBeUpdated,
                updatedAt: new Date(),
            })
            .where(eq(documents.id, documentId))
            .returning();

        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    { updatedDocument: updateDoc },
                    "Document updated successfully"
                )
            );
    }
);



export const generateDownloadLink = asyncHandler(
    async (req: Request, res: Response) => {
        const documentID = req.params.id;
        if (!documentID) throw new ApiError(400, "Document ID is required");

        const [document] = await db
            .select()
            .from(documents)
            .where(eq(documents.id, documentID));

        if (!document) {
            throw new ApiError(404, "Document not found");
        }

        const token = jwt.sign(
            { documentID: document.id },
            process.env.DOWNLOAD_TOKEN_SECRET!,
            { expiresIn: "5m" }
        );

        const downloadUrl = `${process.env.SERVER_BASE_URL}/api/v1/documents/download/${token}`;
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

    const [document] = await db
        .select()
        .from(documents)
        .where(eq(documents.id, documentID));

    if (!document) {
        throw new ApiError(404, "Document not found");
    }

    // const fileUrl = document.filepath;
    // const fileExt = path.extname(fileUrl);
    // const filename = `${document.title}${fileExt}`;

    // const response = await axios.get(fileUrl, { responseType: "stream" });

    // res.setHeader("Content-Type", response.headers["content-type"]);
    // res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    // response.data.pipe(res);

    const filePath = path.join(process.cwd(), document.filepath); // Use absolute path
    const fileExt = path.extname(filePath);
    const filename = `${document.title}${fileExt}`;

    if (!fs.existsSync(filePath)) {
        throw new ApiError(404, "File not found on server");
    }

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

    const { title, tag, uploadedBy, startDate, endDate } =  parsed.data;

    const whereConditions = [];

    if (title) {
        whereConditions.push(like(documents.title, `%${title}%`));
    }

    if (tag) {
        whereConditions.push(like(documents.tag, `%${tag}%`));
    }

    if (uploadedBy) {
        whereConditions.push(eq(documents.uploadedBy, uploadedBy));
    }

    if (startDate) {
        whereConditions.push(gte(documents.createdAt, new Date(startDate)));
    }

    if (endDate) {
        whereConditions.push(lte(documents.createdAt, new Date(endDate)));
    }

    const results = await db
        .select()
        .from(documents)
        .where(or(...whereConditions));

    return res
        .status(200)
        .json(new ApiResponse(200, results, "Filtered documents fetched"));
});
