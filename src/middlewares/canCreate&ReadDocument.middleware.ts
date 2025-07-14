import { db } from "../db/index.ts";
import { userRoles } from "../schemas/userRoles.schema.ts";
import { rolePermission } from "../schemas/rolesPermission.schema.ts";
import { globalPermissions } from "../schemas/globalPermission.schema.ts";
import { eq, and } from "drizzle-orm";
import { ApiError } from "../utils/ApiError.ts";
import { asyncHandler } from "../utils/asyncHandler.ts";
import { RequestWithUser } from "./auth.middleware.ts";
import { Response, NextFunction } from "express";

export const canCreateReadDocument = ( action: "CREATE_DOCUMENT" | "READ_DOCUMENT") =>
    asyncHandler( async (req: RequestWithUser, _: Response, next: NextFunction) => {
        const user = req.user;

        if (!user) {
            throw new ApiError(401,"Unauthorized: user not found in request");
        }

        const [roleRow] = await db
            .select({ roleId: userRoles.roleId })
            .from(userRoles)
            .where(eq(userRoles.userId, user.id));

        if (!roleRow) {
            throw new ApiError(403, "User does not have a role assigned");
        }

        const roleId = roleRow.roleId;

        const [permissionRow] = await db
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

        if (!permissionRow) {
            throw new ApiError(403,`You are not allowed to ${action.toLowerCase()}`);
        }
        return next();
    }
);
