import { pgTable, timestamp, uuid } from "drizzle-orm/pg-core";
import { roles } from "./roles.schema";
import { globalPermissions } from "./globalPermission.schema";

export const rolePermission = pgTable("roles_Permissions", {
    id: uuid("id").primaryKey().defaultRandom(),
    roleId: uuid("roleId").references(() => roles.id).notNull(),
    permissionId: uuid("permissionId").references(() => globalPermissions.id).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
});