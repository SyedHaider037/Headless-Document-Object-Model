import { db } from "../db/index.ts";
import { users } from "../schemas/user.schema.ts";
import { roles } from "../schemas/roles.schema.ts";
import { userRoles } from "../schemas/userRoles.schema.ts";
import { IUserRepository } from "../interfaces/userRepository.interface.ts";
import { RegisterUserDTO } from "../dtos/user.dto.ts";
import { eq } from "drizzle-orm";

export class UserRepository implements IUserRepository {
    async create(data: RegisterUserDTO): Promise<any> {
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
        return user;
    }

    async findByEmail(email: string): Promise<any | null> {
        const [user] = await db
            .select()
            .from(users)
            .where(eq(users.email, email));
        return user ?? null;
    }

    async findById(id: string): Promise<any | null> {
        const [user] = await db.select().from(users).where(eq(users.id, id));
        return user ?? null;
    }

    async findRoleByName(name: string): Promise<any | null> {
        const [role] = await db
            .select()
            .from(roles)
            .where(eq(roles.name, name));
        return role ?? null;
    }

    async findRoleByUserId(userId: string): Promise<any | null> {
        const [role] = await db
            .select({ name: roles.name })
            .from(userRoles)
            .innerJoin(roles, eq(userRoles.roleId, roles.id))
            .where(eq(userRoles.userId, userId));
        return role ?? null;
    }

    async updateRefreshToken(userId: string, token: string | null): Promise<void> {
        await db
            .update(users)
            .set({ refreshToken: token })
            .where(eq(users.id, userId));
    }
    
    async assignRole(userId: string, roleId: string): Promise<void> {
        await db.insert(userRoles).values({ userId, roleId });
    }
}
