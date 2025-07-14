import { pgTable, text, uuid, varchar, timestamp } from "drizzle-orm/pg-core";

export const globalPermissions = pgTable("global_permissions", {
    id: uuid("id").primaryKey().defaultRandom(),
    action: varchar("action", { length: 255 } ).unique().notNull(),
    description: text("description"),
    createdAt: timestamp('createdAt').defaultNow().notNull(),
});