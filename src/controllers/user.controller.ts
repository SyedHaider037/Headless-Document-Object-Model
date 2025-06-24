import { Request, Response } from "express"
import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";
import { asyncHandler } from "../utils/asyncHandler";
import { db } from "../db/index.ts";
import { users } from "../schemas/user.schema";
import { or, eq } from "drizzle-orm";
import { hashPassword, verifyPassword, generateAccessToken, generateRefreshToken } from "../lib/jwt&bcryptAuth";
import { registerSchema } from "../validators/user.validSchema.ts";
import { UserRoles } from "../constants/rolesEnum.ts";

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
