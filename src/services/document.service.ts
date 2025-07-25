import { Result } from "@carbonteq/fp";
import fs from "fs";
import path from "path";
import jwt from "jsonwebtoken";
import { IDocumentService } from "../interfaces/documentService.interface.ts";
import { UploadDocumentDTO, UpdateDocumentDTO, SearchDocumentDTO } from "../dtos/document.dto.ts";
import { IDocumentRepository } from "../interfaces/documentRepository.interface.ts";
import { inject, injectable } from "tsyringe";
import { TOKENS } from "../token.ts";

@injectable()
export class DocumentService implements IDocumentService {
    constructor(@inject(TOKENS.IDocumentRepository) private readonly repo: IDocumentRepository) {}
    async uploadDocument(data: UploadDocumentDTO):Promise<Result<void, string>> {
        const result = await this.repo.create(data);
        return result.mapErr((err) => `Upload failed: ${err}`);
    }

    async getAllDocuments(page: number, limit: number): Promise<Result<{ data: any[]; total: number }, string>>{
        return await this.repo.findAll(page, limit);
    }

    async getDocumentById(id: string): Promise<Result<any, string>> {
        return await this.repo.findById(id);
    }

    async deleteDocument(id: string):  Promise<Result<any, string>> {
        const result = await this.repo.findById(id)
        return result
            .flatMap((doc) => {
                const fullPath = path.join(process.cwd(), doc.filePath);
                if (fs.existsSync(fullPath)) {
                    fs.unlinkSync(fullPath);
                }  
                return this.repo.delete(id);
            })
            .mapErr((err) => `Failed to delete document: ${err}`);
    }

    async updateDocument(id: string, data: UpdateDocumentDTO): Promise<Result<any, string>> {
        const result = await this.repo.update(id, data);
        return result.mapErr((err) => `Update failed: ${err}`);
    }

    async generateDownloadLink(id: string): Promise<Result<string, string>> {
        const result = await this.repo.findById(id)
        return result
            .map((doc) => {
                const token = jwt.sign(
                    { documentID: id },
                    process.env.DOWNLOAD_TOKEN_SECRET!,
                    { expiresIn: "5m" }
                );
                return `${process.env.SERVER_BASE_URL}/api/v1/documents/download/${token}`;
            })
            .mapErr((err) => `Failed to generate download link: ${err}`);
    }

    async streamDocument(id: string): Promise<Result<{ path: string; filename: string }, string>> {
        const result = await this.repo.findById(id)
        return result
            .flatMap((doc) => {
                const filePath = path.join(process.cwd(), doc.filePath);
                const fileExt = path.extname(filePath);
                const filename = `${doc.title}${fileExt}`;

                return fs.existsSync(filePath)
                    ? Result.Ok({ path: filePath, filename })
                    : Result.Err("File not found");
            })
            .mapErr((err) => `Failed to stream document: ${err}`);
    }

    async searchDocuments(filters: SearchDocumentDTO, page: number, limit: number): Promise<Result<{ data: any[]; total: number }, string>> {
        const result = await this.repo.search(filters, page, limit)
        return result.mapErr((err) => "Failed to search documents");
    }
}
