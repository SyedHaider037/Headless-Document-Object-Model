import { db } from "../db/index.ts";
import { documents } from "../schemas/documents.schema.ts";
import { rolePermission } from "../schemas/rolesPermission.schema.ts";
import { globalPermissions } from "../schemas/globalPermission.schema.ts";
import { userRoles } from "../schemas/userRoles.schema.ts";
import { eq, and } from "drizzle-orm";
import { IPermissionRepository } from "../interfaces/permissionRepository.interface.ts";

export class PermissionRepository implements IPermissionRepository {
    async findUserRole(userId: string) {
        const [row] = await db
            .select({ roleId: userRoles.roleId })
            .from(userRoles)
            .where(eq(userRoles.userId, userId));
        return row || null;
    }

    async findDocumentById(docId: string) {
        const [doc] = await db
            .select()
            .from(documents)
            .where(eq(documents.id, docId));
        return doc;
    }

    async checkRolePermission(roleId: string, action: string) {
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
        return !!perm;
    }
}
