import { IUserService } from "../interfaces/userService.interface";
import { RegisterUserDTO, LoginUserDTO, TokenPayload } from "../dtos/user.dto";
import { db } from "../db";
import { users } from "../schemas/user.schema";
import { userRoles } from "../schemas/userRoles.schema";
import { roles } from "../schemas/roles.schema";
import { or, eq } from "drizzle-orm";
import jwt from "jsonwebtoken";
import { hashPassword, verifyPassword, generateAccessToken, generateRefreshToken } from "../lib/jwt&bcryptAuth";
import { ApiError } from "../utils/ApiError";

export class UserService implements IUserService {
    async register(data: RegisterUserDTO): Promise<any> {
        const { username, email, password, role } = data;

        const [existing] = await db.select().from(users).where(or(eq(users.username, username), eq(users.email, email)));
        if (existing) throw new ApiError(400, "User already exists");

        const [roleRow] = await db.select().from(roles).where(eq(roles.name, role));
        if (!roleRow) throw new ApiError(400, "Invalid role provided");

        const hashedPassword = await hashPassword(password);

        const [createdUser] = await db.insert(users).values({
            username,
            email,
            password: hashedPassword,
        }).returning({ id: users.id, username: users.username, email: users.email });

        await db.insert(userRoles).values({ userId: createdUser.id, roleId: roleRow.id });

        return createdUser;
    }

    async login(data: LoginUserDTO) {
        const { email, password } = data;

        const [user] = await db.select().from(users).where(eq(users.email, email));
        if (!user) throw new ApiError(404, "User not found");

        const passwordMatch = await verifyPassword(password, user.password);
        if (!passwordMatch) throw new ApiError(401, "Incorrect password");

        const [roleRow] = await db.select({ name: roles.name }).from(userRoles).innerJoin(roles, eq(userRoles.roleId, roles.id)).where(eq(userRoles.userId, user.id));
        if (!roleRow) throw new ApiError(403, "Role not assigned");

        const tokenPayload: TokenPayload = {
            id: user.id,
            username: user.username,
            email: user.email,
            role: roleRow.name,
        };

        const accessToken = generateAccessToken(tokenPayload);
        const refreshToken = generateRefreshToken({ id: user.id });

        await db.update(users).set({ refreshToken }).where(eq(users.id, user.id));

        const { password: _, refreshToken: __, ...userSafe } = user;
        return { user: userSafe, role: roleRow.name, accessToken, refreshToken };
    }

    async logout(userId: string): Promise<void> {
        await db.update(users).set({ refreshToken: null }).where(eq(users.id, userId));
    }

    async refreshAccessToken(oldRefreshToken: string) {
        let decoded;
        try {
            decoded = jwt.verify(oldRefreshToken, process.env.REFRESH_TOKEN_SECRET!) as { id: string };
    
        } catch (error: any) {
            throw new ApiError(401, error?.message || "Invalid refresh token");
        }

        const [user] = await db.select().from(users).where(eq(users.id, decoded.id));
        if (!user) throw new ApiError(401, "User not found");

        if (user.refreshToken !== oldRefreshToken) {
            throw new ApiError(403, "Refresh token expired or rotated");
        }

        const [roleRow] = await db.select({ name: roles.name }).from(userRoles).innerJoin(roles, eq(userRoles.roleId, roles.id)).where(eq(userRoles.userId, user.id));
        if (!roleRow) throw new ApiError(403, "No role assigned");

        const accessToken = generateAccessToken({
            id: user.id,
            username: user.username,
            email: user.email,
            role: roleRow.name,
        });

        const newRefreshToken = generateRefreshToken({ id: user.id });
        await db.update(users).set({ refreshToken: newRefreshToken }).where(eq(users.id, user.id));

        return { accessToken, refreshToken: newRefreshToken };
    }
}
