import { UploadDocumentDTO, UpdateDocumentDTO, SearchDocumentDTO } from "../dtos/document.dto.ts";

export interface IDocumentRepository {
    create(data: UploadDocumentDTO): Promise<void>;
    findAll(): Promise<any[]>;
    findById(id: string): Promise<any | null>;
    delete(id: string): Promise<any | null>;
    update(id: string, data: UpdateDocumentDTO): Promise<any>;
    search(filters: SearchDocumentDTO): Promise<any[]>;
}