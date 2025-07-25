import { Result } from "@carbonteq/fp";

export interface IPermissionRepository {
    findUserRole(userId: string): Promise<Result<{ roleId: string }, string>>;
    findDocumentById(docId: string): Promise<Result<any, string>>;
    checkRolePermission(roleId: string, action: string): Promise<Result<boolean, string>>;
}
