import { Result } from "@carbonteq/fp";
import { UploadDocumentDTO, UpdateDocumentDTO, SearchDocumentDTO } from "../dtos/document.dto.ts";

export interface IDocumentRepository {
    create(data: UploadDocumentDTO): Promise<Result<void, string>>;
    findAll(page: number, limit: number): Promise<Result<{ data: any[]; total: number }, string>>;
    findById(id: string): Promise<Result<any, string>>;
    delete(id: string): Promise<Result<any, string>>;
    update(id: string, data: UpdateDocumentDTO): Promise<Result<any, string>>;
    search(filters: SearchDocumentDTO, page: number, limit: number):  Promise<Result<{ data: any[]; total: number }, string>>;
}