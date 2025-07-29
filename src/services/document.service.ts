import { ILogger } from "../interfaces/logger.interface.ts";
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
    constructor (
        @inject(TOKENS.IDocumentRepository) private readonly repo: IDocumentRepository,
        @inject(TOKENS.ILogger) private readonly logger : ILogger
    ) {}
    async uploadDocument(data: UploadDocumentDTO):Promise<Result<void, string>> {
        this.logger.info(`Uploading document for user: ${data.uploadedBy}, title: ${data.title}`);

        return Result.Ok(data)
            .flatMap((data) => this.repo.create(data))
            .mapErr((err) => {
                this.logger.error("uploadDocument failed", err);
                return err;
            })
            .toPromise();
    }

    async getAllDocuments(page: number, limit: number): Promise<Result<{ data: any[]; total: number }, string>>{
        this.logger.info(`Fetching all documents - Page: ${page}, Limit: ${limit}`);

        return Result.Ok({ page, limit })
            .flatMap(({page, limit }) => this.repo.findAll(page, limit))
            .mapErr((err) => {
                this.logger.error(`Failed to fetch documents: ${err}`);
                return err;
            })
            .toPromise();
    }

    async getDocumentById(id: string): Promise<Result<any, string>> {
        this.logger.info(`Fetching document by ID: ${id}`);

        return Result.Ok(id)
            .flatMap((id) => this.repo.findById(id))
            .mapErr((err) => {
                this.logger.error(`Failed to find document with ID ${id}: ${err}`);
                return err;
            })
            .toPromise();
    }

    async deleteDocument(id: string):  Promise<Result<any, string>> {
        this.logger.info(`Attempting to delete document with ID: ${id}`);

        return Result.Ok(id)
            .flatMap((id) => this.repo.findById(id))
            .flatMap((doc) => {
                const fullPath = path.join(process.cwd(), doc.filePath);
                if (fs.existsSync(fullPath)) {
                    this.logger.debug(`Deleting file from filesystem: ${fullPath}`);
                    fs.unlinkSync(fullPath);
                } else{
                    this.logger.warn(`File not found on disk: ${fullPath}`);
                } 
                return this.repo.delete(id);
            })
            .mapErr((err) => {
                this.logger.error(`Failed to delete document ${id}: ${err}`);
                return err;
            })
            .toPromise();
    }

    async updateDocument(id: string, data: UpdateDocumentDTO): Promise<Result<any, string>> {
        this.logger.info(`Updating document ID: ${id}`);

        return Result.Ok({id, data})
            .flatMap(({id, data}) => this.repo.update(id, data))
            .mapErr((err) => {
                this.logger.error(`Failed to update document ${id}: ${err}`);
                return err;
            })
            .toPromise();
    }

    async generateDownloadLink(id: string): Promise<Result<string, string>> {
        this.logger.info(`Generating download link for document ID: ${id}`);

        return Result.Ok(id)
            .flatMap((id) => this.repo.findById(id))
            .flatMap(() => {
                const token = jwt.sign(
                    { documentID: id },
                    process.env.DOWNLOAD_TOKEN_SECRET!,
                    { expiresIn: "5m" }
                );
                const link = `${process.env.SERVER_BASE_URL}/api/v1/documents/download/${token}`;
                this.logger.debug(`Download link generated: ${link}`);
                return Result.Ok(link);
            })
            .mapErr((err) => {
                this.logger.error(`Failed to stream document ${id}: ${err}`);
                return err;
            })
            .toPromise();
    }

    async streamDocument(id: string): Promise<Result<{ path: string; filename: string }, string>> {
        this.logger.info(`Streaming document with ID: ${id}`);

        return Result.Ok(id)
            .flatMap((id) => this.repo.findById(id))
            .flatMap((doc) => {
                const filePath = path.join(process.cwd(), doc.filePath);
                const fileExt = path.extname(filePath);
                const filename = `${doc.title}${fileExt}`;

                if (!fs.existsSync(filePath)) {
                    this.logger.warn(`File not found: ${filePath}`);
                    return Result.Err("File not found");
                }

                this.logger.debug(`File ready to stream: ${filename}`);
                return Result.Ok({ path: filePath, filename });
            })
            .toPromise();
    }

    async searchDocuments(filters: SearchDocumentDTO, page: number, limit: number): Promise<Result<{ data: any[]; total: number }, string>> {
        this.logger.info(`Searching documents - Filters: ${JSON.stringify(filters)}, Page: ${page}, Limit: ${limit}`);

        return Result.Ok({filters, page, limit})
            .flatMap(({filters, page, limit}) => this.repo.search(filters, page, limit))
            .mapErr((err) => {
                this.logger.error(`Document search failed: ${err}`);
                return err;
            })
            .toPromise();
    }
}
