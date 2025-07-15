import fs from "fs";
import path from "path";
import jwt from "jsonwebtoken";
import { db } from "../db/index.ts";
import { documents } from "../schemas/documents.schema.ts";
import { eq, like, or, gte, lte } from "drizzle-orm";
import { IDocumentService } from "../interfaces/documentService.interface.ts";
import {
    UploadDocumentDTO,
    UpdateDocumentDTO,
    SearchDocumentDTO,
} from "../dtos/document.dto.ts";

export class DocumentService implements IDocumentService {
    async uploadDocument(data: UploadDocumentDTO): Promise<void> {
        await db.insert(documents).values({
            title: data.title,
            description: data.description,
            tag: data.tag,
            filepath: data.filePath,
            uploadedBy: data.uploadedBy,
        });
    }

    async getAllDocuments(): Promise<any[]> {
        return await db.select().from(documents);
    }

    async getDocumentById(id: string): Promise<any> {
        const [doc] = await db
            .select()
            .from(documents)
            .where(eq(documents.id, id));
        return doc;
    }

    async deleteDocument(id: string): Promise<any> {
        const [document] = await db
            .select()
            .from(documents)
            .where(eq(documents.id, id));
        if (!document) return null;

        const [deleted] = await db
            .delete(documents)
            .where(eq(documents.id, id))
            .returning();

        const fullPath = path.join(process.cwd(), document.filepath);
        if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);

        return deleted;
    }

    async updateDocument(id: string, data: UpdateDocumentDTO): Promise<any> {
        const [updated] = await db
            .update(documents)
            .set({ ...data, updatedAt: new Date() })
            .where(eq(documents.id, id))
            .returning();
        return updated;
    }

    async generateDownloadLink(id: string): Promise<string> {
        const [document] = await db
            .select()
            .from(documents)
            .where(eq(documents.id, id));
        if (!document) throw new Error("Not found");

        const token = jwt.sign(
            { documentID: id },
            process.env.DOWNLOAD_TOKEN_SECRET!,
            {
                expiresIn: "5m",
            }
        );

        return `${process.env.SERVER_BASE_URL}/api/v1/documents/download/${token}`;
    }

    async streamDocument(id: string): Promise<{ path: string; filename: string }> {
        const [document] = await db
            .select()
            .from(documents)
            .where(eq(documents.id, id));
        if (!document) throw new Error("Document not found");

        const filePath = path.join(process.cwd(), document.filepath);
        const fileExt = path.extname(filePath);
        const filename = `${document.title}${fileExt}`;

        if (!fs.existsSync(filePath)) throw new Error("File not found");

        return { path: filePath, filename };
    }

    async searchDocuments(filters: SearchDocumentDTO): Promise<any[]> {
        const conditions = [];

        if (filters.title)
            conditions.push(like(documents.title, `%${filters.title}%`));
        if (filters.tag)
            conditions.push(like(documents.tag, `%${filters.tag}%`));
        if (filters.uploadedBy)
            conditions.push(eq(documents.uploadedBy, filters.uploadedBy));
        if (filters.startDate)
            conditions.push(
                gte(documents.createdAt, new Date(filters.startDate))
            );
        if (filters.endDate)
            conditions.push(
                lte(documents.createdAt, new Date(filters.endDate))
            );

        return await db
            .select()
            .from(documents)
            .where(or(...conditions));
    }
}
