import { Request, Response, NextFunction } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { users } from "../schemas/user.schema";

interface RequestWithUser extends Request {
    user?: typeof users.$inferSelect;
}

export const checkAdminRole = asyncHandler( async (req: RequestWithUser, res: Response, next: NextFunction) => {
    if (!req.user || req.user?.role !== "ADMIN") {
        throw new ApiError(403, "Access denied. Only ADMINs can perform upload .");
    }
    next(); 
});
