import { Result } from "@carbonteq/fp";
import { db } from "../db/index.ts";
import { documents } from "../schemas/documents.schema.ts";
import { IDocumentRepository } from "../interfaces/documentRepository.interface.ts";
import { UploadDocumentDTO, UpdateDocumentDTO, SearchDocumentDTO,} from "../dtos/document.dto.ts";
import { eq, like, or, gte, lte, and, count, desc } from "drizzle-orm";

export class DocumentRepository implements IDocumentRepository {
    async create(data: UploadDocumentDTO): Promise<Result<void, string>> {
        try {
            await db.insert(documents).values(data);
            return Result.Ok(undefined);
        } catch (err) {
            return Result.Err("Failed to insert document into database");
        }
    }

    async findAll(page: number, limit: number): Promise<Result<{ data: any[]; total: number }, string>> {
        try {
            const offset = (page - 1) * limit;
    
            const [totalCount] = await db.select({ count: count() }).from(documents);
    
            const result = await db
                .select()
                .from(documents)
                .limit(limit)
                .offset(offset)
                .orderBy(desc(documents.createdAt));
    
            return Result.Ok({
                data: result,
                total: Number(totalCount.count),
            });
        } catch (err) {
            return Result.Err("Failed to fetch documents");
        }
    }

    async findById(id: string): Promise<Result<any, string>> {
        try {
            const [doc] = await db
                .select()
                .from(documents)
                .where(eq(documents.id, id));
            return doc ? Result.Ok(doc) : Result.Err("Document not found");
        } catch (err) {
            return Result.Err("Failed to fetch document by ID");
        }
    }

    async delete(id: string): Promise<Result<any, string>> {
        try {
            const [deleted] = await db
                .delete(documents)
                .where(eq(documents.id, id))
                .returning();
            return deleted ? Result.Ok(undefined) : Result.Err("Document not found");
        } catch (err) {
            return Result.Err("Failed to delete document");
        }
    }

    async update(id: string, data: UpdateDocumentDTO): Promise<Result<any, string>> {
        try {
            const [updated] = await db
                .update(documents)
                .set({ ...data, updatedAt: new Date() })
                .where(eq(documents.id, id))
                .returning();
            return updated ? Result.Ok(undefined) : Result.Err("No document updated");
        } catch (err) {
            return Result.Err("Failed to update document");
        }
    }

    async search(filters: SearchDocumentDTO, page: number, limit: number):  Promise<Result<{ data: any[]; total: number }, string>> {
        try {
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
                
            const offset = (page - 1) * limit;    
    
            const [totalCount] = await db
                .select({count : count() })
                .from(documents)
                .where(or(...conditions));

            const result = await db
                .select()
                .from(documents)
                .where(and(...conditions))
                .limit(limit)
                .offset(offset)
                .orderBy(desc(documents.createdAt));

            return Result.Ok({
                data: result,
                total: Number(totalCount.count),
            });
        } catch (err) {
            return Result.Err("Failed to search documents");
        }
    }
}
