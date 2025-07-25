import { Result } from "@carbonteq/fp";
import { IPermissionRepository } from "../interfaces/permissionRepository.interface.ts";
import { inject, injectable } from "tsyringe";
import { TOKENS } from "../token.ts";
import { IPermissionService } from "../interfaces/permissionService.interface.ts";

@injectable()
export class PermissionService implements IPermissionService {
    constructor(@inject(TOKENS.IPermissionRepository) private readonly repo: IPermissionRepository) {}

    async canUserChangeDocument( userId: string, role :string, docId: string, action: string, ): Promise<Result<boolean, string>> {
        const resRole = await this.repo.findUserRole(userId);
        if (resRole.isErr()) return Result.Err(resRole.unwrapErr());

        const roleOpt = resRole.unwrap();
        if (roleOpt.isNone()) return Result.Ok(false);

        const roleId = roleOpt.unwrap().roleId;

        const resDocument = await this.repo.findDocumentById(docId);
        if (resDocument.isErr()) return Result.Err(resDocument.unwrapErr());

        const docOpt = resDocument.unwrap();
        if (docOpt.isNone()) return Result.Ok(false);

        const document = docOpt.unwrap();

        if (document.uploadedBy === userId || role === "ADMIN") {
            const resPerm = await this.repo.checkRolePermission(roleId, action);
            if (resPerm.isErr()) return Result.Err(resPerm.unwrapErr());
            return Result.Ok(resPerm.unwrap());
        }

        return Result.Ok(false);
    }

    async canUserPerformAction(userId: string, action: string): Promise<Result<boolean, string>> {
        const resRole = await this.repo.findUserRole(userId);
        if (resRole.isErr()) return Result.Err(resRole.unwrapErr());

        const roleOpt = resRole.unwrap();
        if (roleOpt.isNone()) return Result.Ok(false);

        const roleId = roleOpt.unwrap().roleId;

        const resPermission  =  await this.repo.checkRolePermission(roleId, action);
        if (resPermission.isErr()) return Result.Err(resPermission.unwrapErr());

        return Result.Ok(resPermission.unwrap());
    }
}
