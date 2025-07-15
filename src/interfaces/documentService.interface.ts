import { UploadDocumentDTO, UpdateDocumentDTO, SearchDocumentDTO } from "../dtos/document.dto";

export interface IDocumentService {
    uploadDocument(data: UploadDocumentDTO): Promise<void>;
    getAllDocuments(): Promise<any[]>;
    getDocumentById(id: string): Promise<any>;
    deleteDocument(id: string): Promise<any>;
    updateDocument(id: string, data: UpdateDocumentDTO): Promise<any>;
    generateDownloadLink(id: string): Promise<string>;
    streamDocument(id: string): Promise<{ path: string; filename: string }>;
    searchDocuments(filters: SearchDocumentDTO): Promise<any[]>;
}
