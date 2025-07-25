import { Result } from "@carbonteq/fp"
import { db } from "../db/index.ts";
import { users } from "../schemas/user.schema.ts";
import { roles } from "../schemas/roles.schema.ts";
import { userRoles } from "../schemas/userRoles.schema.ts";
import { IUserRepository } from "../interfaces/userRepository.interface.ts";
import { RegisterUserDTO } from "../dtos/user.dto.ts";
import { eq } from "drizzle-orm";

export class UserRepository implements IUserRepository {
    async create(data: RegisterUserDTO) : Promise<Result<any, string>>{
        try {
            const [user] = await db
                .insert(users)
                .values({
                    username: data.username,
                    email: data.email,
                    password: data.password,
                })
                .returning({
                    id: users.id,
                    username: users.username,
                    email: users.email,
                });
            return Result.Ok(user);
        } catch (err) {
            return Result.Err("Failed to create user");
        }
    }

    async findByEmail(email: string): Promise<Result<any, string>> {
        try {
            const [user] = await db
                .select()
                .from(users)
                .where(eq(users.email, email));
            return user ? Result.Ok(user) : Result.Err("User with this email not found");
        } catch (err) {
            return Result.Err("Failed to fetch user by email");
        }
    }

    async findById(id: string): Promise<Result<any, string>> {
        try {
            const [user] = await db.select().from(users).where(eq(users.id, id));
            return user ? Result.Ok(user) : Result.Err("User with this ID not found");
        } catch (err) {
            return Result.Err("Failed to fetch user by ID");
        }
    }

    async findRoleByName(name: string): Promise<Result<any, string>> {
        try {
            const [role] = await db
                .select()
                .from(roles)
                .where(eq(roles.name, name));
            return role ? Result.Ok(role) : Result.Err("Role with this name not found");
        } catch (err) {
            return Result.Err("Failed to fetch role by name");
        }
    }

    async findRoleByUserId(userId: string): Promise<Result<any, string>> {
        try {
            const [role] = await db
                .select({ name: roles.name })
                .from(userRoles)
                .innerJoin(roles, eq(userRoles.roleId, roles.id))
                .where(eq(userRoles.userId, userId));
            return role ? Result.Ok(role) : Result.Err("Role with this name not found");
        } catch (err) {
            return Result.Err("Failed to fetch role for user");
        }
    }

    async updateRefreshToken(userId: string, token: string | null): Promise<Result<void, string>>{
        try {
            await db
                .update(users)
                .set({ refreshToken: token })
                .where(eq(users.id, userId));
            return Result.Ok(undefined);
        } catch (err) {
            return Result.Err("Failed to update refresh token");
        }
    }
    
    async assignRole(userId: string, roleId: string): Promise<Result<void, string>>{
        try {
            await db.insert(userRoles).values({ userId, roleId });
            return Result.Ok(undefined);
        } catch (err) {
            return Result.Err("Failed to assign role");
        }
    }
}
