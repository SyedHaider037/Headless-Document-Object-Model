import { Request, Response } from "express"
import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";
import { asyncHandler } from "../utils/asyncHandler";
import { db } from "../db/index.ts";
import { users } from "../schemas/user.schema";
import { or, eq } from "drizzle-orm";
import { hashPassword, verifyPassword, generateAccessToken, generateRefreshToken } from "../lib/jwt&bcryptAuth";
import { registerSchema, loginSchema } from "../validators/user.validSchema.ts";
import { UserRoles } from "../constants/rolesEnum.ts";
import jwt from "jsonwebtoken";

interface RequestWithUser extends Request {
    user: typeof users.$inferSelect;
}

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

    const hashed = await hashPassword(password);

    const createdUser = await db.insert(users).values({
        username,
        email, 
        password : hashed,
        role: role as UserRoles,
    })
    .returning({ 
        id: users.id,
        username: users.username,
        email: users.email,
        role: users.role,
    })

    return res
        .status(201)
        .json(new ApiResponse(201, createdUser, "User created Successfully."));

});



export const loginUser = asyncHandler ( async (req: Request, res: Response) => {
    const parsed = loginSchema.safeParse(req.body);

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

    const { password :_removed, ...userWithoutPassword } = user;

    const accessToken = generateAccessToken({
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
    });

    const refreshToken = generateRefreshToken({id: user.id});

    await db.update(users)
        .set({refreshToken})
        .where(eq(users.id , user.id));

    const options = {
        httpOnly: true,
        secure: true,
        sameSite: "strict" as const,
    }

    return res
        .status(201)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                200,
                {
                    user: userWithoutPassword,
                    accessToken,
                    refreshToken,
                },
                "User logged in successfully."
            )
        );
});



export const logoutUser = asyncHandler( async (req: Request, res: Response) => {

    const typedReq = req as RequestWithUser;
    await db.update(users)
        .set({ refreshToken: null })
        .where(eq(users.id, typedReq.user.id));

    const options = {
        httpOnly : true,
        secure: true,
        sameSite: "strict" as const,
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
            throw new ApiError(400, "Refresh Token is expired")
        }
    
        const options = {
            httpOnly: true,
            secure: true
        }
        
        const accessToken = generateAccessToken({
            id: existedUser.id,
            username: existedUser.username,
            email: existedUser.email,
            role: existedUser.role,
        });

        const newRefreshToken = generateRefreshToken({id: existedUser.id});

        await db.update(users)
            .set({refreshToken: newRefreshToken})
            .where(eq(users.id , existedUser.id));

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