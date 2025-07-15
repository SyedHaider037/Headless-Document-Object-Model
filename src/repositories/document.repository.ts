import { db } from "../db";
import { documents } from "../schemas/documents.schema";
import { IDocumentRepository } from "../interfaces/documentRepository.interface";
import { UploadDocumentDTO, UpdateDocumentDTO, SearchDocumentDTO,} from "../dtos/document.dto";
import { eq, like, or, gte, lte } from "drizzle-orm";

export class DocumentRepository implements IDocumentRepository {
    async create(data: UploadDocumentDTO): Promise<void> {
        await db.insert(documents).values(data);
    }

    async findAll(): Promise<any[]> {
        return await db.select().from(documents);
    }

    async findById(id: string): Promise<any | null> {
        const [doc] = await db
            .select()
            .from(documents)
            .where(eq(documents.id, id));
        return doc ?? null;
    }

    async delete(id: string): Promise<any | null> {
        const [deleted] = await db
            .delete(documents)
            .where(eq(documents.id, id))
            .returning();
        return deleted ?? null;
    }

    async update(id: string, data: UpdateDocumentDTO): Promise<any> {
        const [updated] = await db
            .update(documents)
            .set({ ...data, updatedAt: new Date() })
            .where(eq(documents.id, id))
            .returning();
        return updated;
    }

    async search(filters: SearchDocumentDTO): Promise<any[]> {
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
