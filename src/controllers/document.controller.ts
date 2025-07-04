import { Request, Response } from "express";
import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";
import { asyncHandler } from "../utils/asyncHandler";
import { db } from "../db/index.ts";
import { documents } from "../schemas/documents.schema.ts";
import { permissions } from "../schemas/permission.schema.ts";
import {
    createDocumentSchema,
    updateDocumentSchema,
    documentSearchSchema,
} from "../validators/document.validSchema.ts";
import { uploadOnCloudinary } from "../utils/cloudinary.ts";
import { grantPermissionSchema } from "../validators/permission.validSchema.ts";
import { users } from "../schemas/user.schema.ts";
import { eq, and, sql, gte, lte } from "drizzle-orm";
import jwt from "jsonwebtoken";
import axios from "axios";
import path from "path";


interface RequestWithUser extends Request {
    user: typeof users.$inferSelect;
}


export const createDocument = asyncHandler(
    async (req: Request, res: Response) => {
        const typedReq = req as RequestWithUser;

        if (req.body.metadata) {
            try {
                req.body.metadata = JSON.parse(req.body.metadata);
            } catch (err) {
                throw new ApiError(
                    400,
                    "Invalid metadata format. Must be valid JSON."
                );
            }
        }

        const parsed = createDocumentSchema.safeParse(req.body);

        if (!parsed.success) {
            throw new ApiError(400, "Invalid input", parsed.error.errors);
        }

        const file = req.file;
        if (!file) {
            throw new ApiError(400, "No file uploaded, File Required");
        }

        const { title, description, metadata, tag } = parsed.data;

        const uploadedFile = await uploadOnCloudinary(file.path);
        if (!uploadedFile?.secure_url) {
            throw new ApiError(500, "File upload failed");
        }

        await db.insert(documents).values({
            title,
            description,
            metadata,
            tag,
            filepath: uploadedFile.secure_url,
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

        if (!documentslist) {
            throw new ApiError(500, "Document List is empty");
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
        const typedReq = req as RequestWithUser;
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

        const isAdmin = typedReq.user?.role === "ADMIN";
        const isOwner = document.uploadedBy === typedReq.user?.id;

        if (!isAdmin && !isOwner) {
            const [permissionEntity] = await db
                .select()
                .from(permissions)
                .where(
                    and(
                        eq(permissions.userId, typedReq.user!.id),
                        eq(permissions.documentId, documentID)
                    )
                );

            if (!permissionEntity?.canDelete) {
                throw new ApiError(403,"You do not have permission to delete this document");
            }
        }

        const [documentdeleted] = await db
            .delete(documents)
            .where(eq(documents.id, documentID))
            .returning();

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
        const typedReq = req as RequestWithUser;
        const documentId = req.params.id;

        if (!documentId) {
            throw new ApiError(400, "Document ID is missing");
        }

        if (req.body.metadata) {
            try {
                req.body.metadata = JSON.parse(req.body.metadata);
            } catch (err) {
                throw new ApiError(
                    400,
                    "Invalid metadata format. Must be valid JSON."
                );
            }
        }

        const parsed = updateDocumentSchema.safeParse(req.body);
        if (!parsed.success) {
            throw new ApiError(400, "Invalid input", parsed.error.errors);
        }

        const dataToBeUpdated = parsed.data;

        const [document] = await db
            .select()
            .from(documents)
            .where(eq(documents.id, documentId));

        if (!document) {
            throw new ApiError(404, "Document with given id was not found");
        }

        const isAdmin = typedReq.user?.role === "ADMIN";
        const isOwner = document.uploadedBy === typedReq.user?.id;

        if (!isAdmin && !isOwner) {
            const [permissionEntity] = await db
                .select()
                .from(permissions)
                .where(
                    and(
                        eq(permissions.userId, typedReq.user!.id),
                        eq(permissions.documentId, documentId)
                    )
                );

            if (!permissionEntity?.canUpdate) {
                throw new ApiError(403,"You do not have permission to update this document because you are not admin, owner and update permission are not granted to you");
            }
        }

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



export const grantPermission = asyncHandler(
    async (req: Request, res: Response) => {
        const typedReq = req as RequestWithUser;
        const documentId = req.params.id;
        if (!documentId) throw new ApiError(400, "Document ID is missing.");

        const parsed = grantPermissionSchema.safeParse(req.body);
        if (!parsed.success) {
            throw new ApiError(400, "Invalid input", parsed.error.errors);
        }

        const [document] = await db
            .select()
            .from(documents)
            .where(eq(documents.id, documentId));

        if (!document)
            throw new ApiError(
                404,
                "Permission cannot be granted as Document not found. "
            );

        const { userId, givenPermissions } = parsed.data;

        if (userId === typedReq.user?.id) {
            throw new ApiError(400,"Admin has full access and cannot assign permissions himself.");
        }

        if (userId === document.uploadedBy) {
            throw new ApiError(400, "Owner already has full permissions to his documents.");
        }

        const [existedUser] = await db
            .select()
            .from(users)
            .where(eq(users.id, userId));

        if (!existedUser) {
            throw new ApiError(404, "The user you are trying to assign permissions doesnot exists.");
        }

        if (existedUser.role === "ADMIN") {
            throw new ApiError(400,"The person you are trying to assign permissions is an Admin and already has full access");
        }

        const [permissionEntity] = await db
            .insert(permissions)
            .values({
                userId,
                documentId,
                ...givenPermissions,
            })
            .onConflictDoUpdate({
                target: [permissions.userId, permissions.documentId],
                set: {
                    ...givenPermissions,
                    updatedAt: new Date(),
                },
            })
            .returning();

        if (!permissionEntity) {
            throw new ApiError(500, "Permission for insert/update failed.");
        }

        return res
            .status(200)
            .json(new ApiResponse(200, {}, "Permissions granted/updated"));
    }
);



export const revokePermission = asyncHandler(async (req, res) => {
    const typedReq = req as RequestWithUser;
    const documentId = req.params.id;
    const userId = req.params.userId;

    if (!documentId || !userId) {
        throw new ApiError(400, "Document ID or User ID is missing.");
    }

    const [document] = await db
        .select()
        .from(documents)
        .where(eq(documents.id, documentId));

    if (!document) throw new ApiError(404, "Document not found.");

    if (typedReq.user?.id === userId) {
        throw new ApiError(400, "Admin cannot delete his own permissions.");
    }

    const [existingPermission] = await db
        .select()
        .from(permissions)
        .where(
            and(
                eq(permissions.documentId, documentId),
                eq(permissions.userId, userId)
            )
        );

    if (!existingPermission) {
        throw new ApiError(404,"Permissions does not exist for the given user for particular document.");
    }

    const [deletedPermissionEntity] = await db
        .delete(permissions)
        .where(
            and(
                eq(permissions.documentId, documentId),
                eq(permissions.userId, userId)
            )
        )
        .returning();

    if (!deletedPermissionEntity) {
        throw new ApiError(500, "Failed to delete permissions.");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Permissions revoked successfully"));
});



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

    const fileUrl = document.filepath;
    const fileExt = path.extname(fileUrl);
    const filename = `${document.title}${fileExt}`;

    const response = await axios.get(fileUrl, { responseType: "stream" });

    res.setHeader("Content-Type", response.headers["content-type"]);
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    response.data.pipe(res);
});



export const searchDocuments = asyncHandler(async (req, res) => {
    const parsed = documentSearchSchema.safeParse(req.query);

    if (!parsed.success) {
        throw new ApiError(400, "Invalid search params", parsed.error.errors);
    }

    const { tag, uploadedBy, metaKey, metaValue, startDate, endDate } =
        parsed.data;

    const whereConditions = [];

    if (tag) {
        whereConditions.push(eq(documents.tag, tag));
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

    if (metaKey && metaValue) {
        whereConditions.push(
            sql`${documents.metadata}->>${sql.raw(`'${metaKey}'`)} = ${metaValue}`
        );
    }

    const results = await db
        .select()
        .from(documents)
        .where(and(...whereConditions));

    return res
        .status(200)
        .json(new ApiResponse(200, results, "Filtered documents fetched"));
});
