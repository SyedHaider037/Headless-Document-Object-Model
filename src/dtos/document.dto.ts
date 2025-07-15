export interface UploadDocumentDTO {
    title: string;
    description?: string;
    tag: string;
    filePath: string;
    uploadedBy: string;
}

export interface UpdateDocumentDTO {
    title?: string;
    description?: string;
    tag?: string;
}

export interface SearchDocumentDTO {
    title?: string;
    tag?: string;
    uploadedBy?: string;
    startDate?: string;
    endDate?: string;
}
