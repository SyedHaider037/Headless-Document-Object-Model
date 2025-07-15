import fs from "fs";
import path from "path";
import jwt from "jsonwebtoken";
import { IDocumentService } from "../interfaces/documentService.interface.ts";
import { UploadDocumentDTO, UpdateDocumentDTO, SearchDocumentDTO } from "../dtos/document.dto.ts";
import { IDocumentRepository } from "../interfaces/documentRepository.interface";


export class DocumentService implements IDocumentService {
    constructor(private readonly repo: IDocumentRepository) {}
    async uploadDocument(data: UploadDocumentDTO): Promise<void> {
        await this.repo.create(data);
    }

    async getAllDocuments(): Promise<any[]> {
        return this.repo.findAll();
    }

    async getDocumentById(id: string): Promise<any> {
        return this.repo.findById(id);
    }

    async deleteDocument(id: string): Promise<any> {
        const document = await this.repo.findById(id);
        if (!document) return null;

        const deleted = await this.repo.delete(id);

        const fullPath = path.join(process.cwd(), document.filepath);
        if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);

        return deleted;
    }

    async updateDocument(id: string, data: UpdateDocumentDTO): Promise<any> {
        return this.repo.update(id, data);
    }

    async generateDownloadLink(id: string): Promise<string> {
        const document = await this.repo.findById(id);
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
        const document = await this.repo.findById(id);
        if (!document) throw new Error("Document not found");

        const filePath = path.join(process.cwd(), document.filepath);
        const fileExt = path.extname(filePath);
        const filename = `${document.title}${fileExt}`;

        if (!fs.existsSync(filePath)) throw new Error("File not found");

        return { path: filePath, filename };
    }

    async searchDocuments(filters: SearchDocumentDTO): Promise<any[]> {
        return this.repo.search(filters);
    }
}
