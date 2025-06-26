import jwt from "jsonwebtoken";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { Request, Response, NextFunction } from "express";
import { db } from "../db/index.ts";
import { users } from "../schemas/user.schema";
import { eq } from "drizzle-orm";

interface RequestWithUser extends Request {
    user?: typeof users.$inferSelect;
}

type MyToken ={
    id: string,
    username: string,
    email: string,
    role: string,
}

export const verifyJWT = asyncHandler( async (req:RequestWithUser, _: Response, next: NextFunction) => {
    const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer","");
    
    if (!token) {
        throw new ApiError(401, "Unauthorized request")
    }

    let decodedToken: MyToken;
    
    try {
        decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET!) as MyToken;
    } catch (error: any) {
        if (error.name === "TokenExpiredError") {
            throw new ApiError(401, "Access Token expired")
        }
        throw new ApiError(401,"Invalid access token")
    }
    
    const [existedUser] = await db.select().from(users).where(eq(users.id, decodedToken.id));
    
    if (!existedUser) {
        throw new ApiError(401, "User does not exist.");
    }
    
    req.user = existedUser;
    next();
});
