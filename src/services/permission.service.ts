import { IPermissionRepository } from "../interfaces/permissionRepository.interface.ts";
import { inject, injectable } from "tsyringe";
import { TOKENS } from "../token.ts";

@injectable()
export class PermissionService {
    constructor(@inject(TOKENS.IPermissionRepository)private readonly repo: IPermissionRepository) {}

    async canUserChangeDocument( userId: string, role :string, docId: string, action: string, ): Promise<boolean> {
        const roleRow = await this.repo.findUserRole(userId);
        if (!roleRow) return false;

        const roleId = roleRow.roleId;

        const document = await this.repo.findDocumentById(docId);
        if (!document) return false;

        if (document.uploadedBy === userId) {
            return await this.repo.checkRolePermission(roleRow.roleId, action);
        }

        if (role === "ADMIN") {
            return await this.repo.checkRolePermission(roleId, action);
        }

        return false;
    }

    async canUserPerformAction(userId: string, action: string): Promise<boolean> {
        const roleRow = await this.repo.findUserRole(userId);
        if (!roleRow) return false;

        const roleId = roleRow.roleId;

        return await this.repo.checkRolePermission(roleId, action);
    }
}
