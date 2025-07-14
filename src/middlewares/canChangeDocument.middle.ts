import { db } from "../db/index.ts";
import { documents } from "../schemas/documents.schema.ts";
import { rolePermission } from "../schemas/rolesPermission.schema.ts";
import { userRoles } from "../schemas/userRoles.schema.ts";
import { globalPermissions } from "../schemas/globalPermission.schema.ts";
import { eq, and } from "drizzle-orm";
import { ApiError } from "../utils/ApiError.ts";
import { asyncHandler } from "../utils/asyncHandler.ts";
import { Response, NextFunction } from "express";
import { RequestWithUser } from "./auth.middleware.ts";

export const canChangeDocument = (action: "UPDATE_DOCUMENT" | "DELETE_DOCUMENT") =>
    asyncHandler ( async (req: RequestWithUser, _: Response, next: NextFunction) => {
        const docId = req.params.id;
        const user = req.user;

        if (!user) {
            throw new ApiError(401, "Unauthorized: user not found in request");
        }

        const [document] = await db
            .select()
            .from(documents)
            .where(eq(documents.id, docId));

        if (!document) {
            throw new ApiError(404, "Document not found");
        }

        const [roleRow] = await db
            .select({ roleId: userRoles.roleId })
            .from(userRoles)
            .where(eq(userRoles.userId, user.id));

        if (!roleRow) {
            throw new ApiError(403, "No role assigned to user");
        }

        const roleId = roleRow.roleId;

        if (document.uploadedBy === user.id) {
            const [ownerPermission] = await db
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

            if (!ownerPermission) {
                throw new ApiError(403,`You don't have permission to ${action.toLowerCase()} your document`);
            }
            console.log(ownerPermission);
            return next(); 
        }

        if (user.role === "ADMIN") {
            const [adminPermission] = await db
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

            if (adminPermission) return next(); 
            console.log(adminPermission);
        }
        throw new ApiError(403,"You are not authorized to perform this action");
    }
);
