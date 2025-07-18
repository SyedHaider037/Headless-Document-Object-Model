export interface IPermissionRepository {
    findUserRole(userId: string): Promise<{ roleId: string } | null>;
    findDocumentById(docId: string): Promise<any>;
    checkRolePermission(roleId: string, action: string): Promise<boolean>;
}
