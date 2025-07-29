import { matchRes } from "@carbonteq/fp";
import jwt from "jsonwebtoken";
import { asyncHandler } from "../utils/asyncHandler.ts";
import { ApiError } from "../utils/ApiError.ts";
import { Request, Response, NextFunction } from "express";
import { users } from "../schemas/user.schema.ts";
import { container } from "tsyringe";
import { AuthService } from "../services/auth.service.ts";

export interface RequestWithUser extends Request {
    user?: typeof users.$inferSelect & { role?: "ADMIN" | "USER" };
}

const userRepo = container.resolve(AuthService)

export type MyToken ={
    id: string,
    username: string,
    email: string,
    role: string,
}

export const verifyJWT = asyncHandler( async (req:RequestWithUser, _: Response, next: NextFunction) => {
    const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer","");
    
    if (!token) throw new ApiError(401, "Unauthorized request");

    let decodedToken: MyToken;
    
    try {
        decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET!) as MyToken;
    } catch (error: any) {
        if (error.name === "TokenExpiredError") {
            throw new ApiError(401, "Access Token expired")
        }
        throw new ApiError(401,"Invalid access token")
    }
    
    const result  = await userRepo.getUserById(decodedToken.id)
    
    return matchRes(result, {
            Ok: (user) => {
                req.user = {
                    ...user,
                    role: decodedToken.role as "ADMIN" | "USER",
                };
                return next();
            },
            Err: (err) => {
                throw new ApiError(401, `User authentication failed: ${err}`);
            },
    });
});
