import { Result } from "@carbonteq/fp";

export interface IPermissionService {
    canUserChangeDocument(userId: string, role: string, docId: string, action: string): Promise<Result<boolean, string>>;
    canUserPerformAction(userId: string, action: string): Promise<Result<boolean, string>>;
}