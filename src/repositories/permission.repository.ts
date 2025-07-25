import { Result } from "@carbonteq/fp";
import { db } from "../db/index.ts";
import { documents } from "../schemas/documents.schema.ts";
import { rolePermission } from "../schemas/rolesPermission.schema.ts";
import { globalPermissions } from "../schemas/globalPermission.schema.ts";
import { userRoles } from "../schemas/userRoles.schema.ts";
import { eq, and } from "drizzle-orm";
import { IPermissionRepository } from "../interfaces/permissionRepository.interface.ts";

export class PermissionRepository implements IPermissionRepository {
    async findUserRole(userId: string): Promise<Result<{ roleId: string }, string>> {
        try {
            const [row] = await db
                .select({ roleId: userRoles.roleId })
                .from(userRoles)
                .where(eq(userRoles.userId, userId));
            return row ? Result.Ok(row) : Result.Err("User role not found");
        } catch (err) {
            return Result.Err("Failed to fetch user role");
        }
    }

    async findDocumentById(docId: string): Promise<Result<any, string>> {
        try {
            const [doc] = await db
                .select()
                .from(documents)
                .where(eq(documents.id, docId));
            return doc ? Result.Ok(doc) : Result.Err("Document not found");
        } catch (err) {
            return Result.Err("Failed to fetch document by ID");
        }
    }

    async checkRolePermission(roleId: string, action: string): Promise<Result<boolean, string>> {
        try {
            const [perm] = await db
                .select()
                .from(rolePermission)
                .innerJoin(
                    globalPermissions,
                    eq(rolePermission.permissionId, globalPermissions.id)
                )
                .where(
                    and(
                        eq(rolePermission.roleId, roleId),
                        eq(globalPermissions.action, action)
                    )
                );
            return Result.Ok(!!perm);
        } catch (err) {
            return Result.Err("Failed to check role permission");
        }
    }
}
