import { pgTable, uuid, timestamp } from "drizzle-orm/pg-core";
import { users } from "./user.schema.ts";
import { roles } from "./roles.schema.ts";

export const userRoles = pgTable("user_roles", {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id).notNull(),
    roleId: uuid("role_id").references(() => roles.id).notNull(),
    createdAt: timestamp('createdAt').defaultNow().notNull(),
});