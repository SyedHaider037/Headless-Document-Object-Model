import { Request, Response } from "express";
import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";
import { asyncHandler } from "../utils/asyncHandler";
import { db } from "../db/index.ts";
import { users } from "../schemas/user.schema.ts";
import { userRoles } from "../schemas/userRoles.schema.ts";
import { roles } from "../schemas/roles.schema.ts";
import { or, eq } from "drizzle-orm";
import { hashPassword, verifyPassword, generateAccessToken, generateRefreshToken } from "../lib/jwt&bcryptAuth";
import { registerSchema, loginSchema } from "../validators/user.validSchema.ts";
import jwt from "jsonwebtoken";
import { RequestWithUser } from "../middlewares/auth.middleware.ts";

type MyToken = {
    id: string;
}

export const registerUser = asyncHandler( async (req: Request, res: Response) => {
    const parsed = registerSchema.safeParse(req.body);

    if (!parsed.success){
        throw new ApiError(400, "Invalid input", parsed.error.errors);
    }

    const { username, email, password, role } = parsed.data;

    const [existedUser] = await db
        .select()
        .from(users)
        .where(
            or(
                eq(users.username, username),
                eq(users.email, email),
            )
        );
    if (existedUser) {
        throw new ApiError(400, "User already exists with this Username or Email.");
    }

    const [roleRow] = await db
        .select()
        .from(roles)
        .where(eq(roles.name, role)); 

    if (!roleRow) {
        throw new ApiError(400, "Invalid role provided");
    }    

    const hashed = await hashPassword(password);

    const [createdUser] = await db.insert(users).values({
        username,
        email, 
        password : hashed,
    })
    .returning({ 
        id: users.id,
        username: users.username,
        email: users.email,
    });

    await db.insert(userRoles).values({
        userId: createdUser.id,
        roleId: roleRow.id,
    });    

    return res
        .status(201)
        .json(new ApiResponse(201, createdUser, "User created Successfully."))

});



export const loginUser = asyncHandler ( async (req: Request, res: Response) => {
    const parsed = loginSchema.safeParse(req.body);
    console.log(req);

    if (!parsed.success) {
        throw new ApiError(400, "Invalid input.", parsed.error.errors)
    }

    const { email, password } = parsed.data;
    
    const [user] = await db.select().from(users).where(eq(users.email, email));
    if (!user) {
        throw new ApiError(409,"User with this email does not exists.")
    }

    const passwordMatched = await verifyPassword(password, user.password);
    if (!passwordMatched) {
        throw new ApiError(401,"Password donot match.");
    }

    const { password :_removed, refreshToken: _removedtoken, ...userWithoutPassword } = user;

    const [userRoleRow] = await db
        .select({ name: roles.name })
        .from(userRoles)
        .innerJoin(roles, eq(userRoles.roleId, roles.id))
        .where(eq(userRoles.userId, user.id));

    if (!userRoleRow) {
        throw new ApiError(403, "No role assigned to user.");
    }    

    const accessToken = generateAccessToken({
        id: user.id,
        username: user.username,
        email: user.email,
        role: userRoleRow.name,
    });

    const refreshToken = generateRefreshToken({id: user.id});

    await db.update(users).set({refreshToken}).where(eq(users.id , user.id));

    const options = {
        httpOnly: true,
        secure: true,
        sameSite: "strict" as const,
        maxAge: 5 * 24 * 60 * 60 * 1000,
    }

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                200,
                {
                    user: userWithoutPassword,
                    role: userRoleRow.name,
                    accessToken,
                    refreshToken,
                },
                "User logged in successfully."
            )
        );
});



export const logoutUser = asyncHandler( async (req: RequestWithUser, res: Response) => {

    if (!req.user) {
        throw new ApiError(401, "Unauthorized: user not found");
    }

    await db.update(users)
        .set({ refreshToken: null })
        .where(eq(users.id, req.user.id));

    const options = {
        httpOnly : true,
        secure: true,
        sameSite: "strict" as const,
        maxAge: 5 * 24 * 60 * 60 * 1000,
    }

    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200,{},"User Logged Out Successfully."))
});



export const refreshAccessToken = asyncHandler ( async (req: Request, res: Response) => {
    const incomingRequest = req.cookies?.refreshToken || req.body?.refreshToken;

    if (!incomingRequest) {
        throw new ApiError(401,"Unauthorized Request");
    }

    try {
        const decodedToken = jwt.verify(incomingRequest, process.env.REFRESH_TOKEN_SECRET!) as MyToken;
    
        const [existedUser] = await db.select().from(users).where(eq(users.id, decodedToken.id))
    
        if (!existedUser) {
            throw new ApiError(401,"User doesnot exits.")
        }
    
        if (incomingRequest !== existedUser?.refreshToken) {
            throw new ApiError(403, "Refresh token is no longer valid or has been rotated");
        }

        const [userRoleRow] = await db
            .select({ name: roles.name })
            .from(userRoles)
            .innerJoin(roles, eq(userRoles.roleId, roles.id))
            .where(eq(userRoles.userId, existedUser.id));

        if (!userRoleRow) {
            throw new ApiError(403, "User does not have any role assigned.");
        }
    
        const accessToken = generateAccessToken({
            id: existedUser.id,
            username: existedUser.username,
            email: existedUser.email,
            role: userRoleRow.name, 
        });

        const newRefreshToken = generateRefreshToken({id: existedUser.id});

        await db.update(users)
            .set({refreshToken: newRefreshToken})
            .where(eq(users.id , existedUser.id));
        
        const options = {
            httpOnly: true,
            secure: true,
            sameSite: "strict" as const,
            maxAge: 5 * 24 * 60 * 60 * 1000,
        }    

        return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", newRefreshToken, options)
        .json(
            new ApiResponse(
                200,
                {accessToken, refreshToken: newRefreshToken},
                "Access token refreshed"
            )
        )
    } catch (error: any) {
        throw new ApiError(401, error?.message || "Invalid refresh token")
    }

})