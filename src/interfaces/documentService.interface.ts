import { Result, Option } from "@carbonteq/fp";
import { UploadDocumentDTO, UpdateDocumentDTO, SearchDocumentDTO } from "../dtos/document.dto.ts";

export interface IDocumentService {
    uploadDocument(data: UploadDocumentDTO): Promise<Result<void, string>>;
    getAllDocuments(page: number, limit: number): Promise<Result<{ data: any[]; total: number }, string>>;
    getDocumentById(id: string): Promise<Result<any, string>>;
    deleteDocument(id: string): Promise<Result<any, string>>;
    updateDocument(id: string, data: UpdateDocumentDTO): Promise<Result<any, string>>;
    generateDownloadLink(id: string): Promise<Result<string, string>>;
    streamDocument(id: string): Promise<Result<{ path: string; filename: string }, string>>;
    searchDocuments(filters: SearchDocumentDTO, page: number, limit: number): Promise<Result<{ data: any[]; total: number }, string>>;
}
