import { matchRes } from "@carbonteq/fp";
import { ApiError } from "../utils/ApiError.ts";
import { asyncHandler } from "../utils/asyncHandler.ts";
import { RequestWithUser } from "./auth.middleware.ts";
import { Response, NextFunction } from "express";
import { PermissionService } from "../services/permission.service.ts";
import { container } from "tsyringe";

const permissionService = container.resolve(PermissionService)

export const canCreateReadDocument = ( action: "CREATE_DOCUMENT" | "READ_DOCUMENT") =>
    asyncHandler( async (req: RequestWithUser, _: Response, next: NextFunction) => {
    
        if (!req.user) {
            throw new ApiError(401,"Unauthorized: user not found in request");
        }

        const result = await permissionService.canUserPerformAction(req.user.id, action);

        return matchRes(result, {
            Ok: (allowed) => {
                if (!allowed) {
                    throw new ApiError(403, `You are not allowed to ${action.toLowerCase()}`);
                }
                return next();
            },
            Err: (err) => {
                throw new ApiError(403, err);
            },
        });
    }
);
