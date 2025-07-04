import { users } from "./user.schema.ts";
import { documents } from "./documents.schema.ts";
import { pgTable, uuid, boolean, timestamp, serial, unique } from "drizzle-orm/pg-core";

export const permissions = pgTable(
    "permissions",
    {
        id: serial("id").notNull(),
        uuid: uuid("uuid").primaryKey().defaultRandom(),
        userId: uuid("userId").references(() => users.id).notNull(),
        documentId: uuid("documentId").references(() => documents.id).notNull(),
        canRead: boolean("can_read").default(true),
        canUpdate: boolean("can_update").default(false),
        canDelete: boolean("can_delete").default(false),
        createdAt: timestamp("created_at").defaultNow().notNull(),
        updatedAt: timestamp("updated_at").defaultNow().notNull(),
    },
    (table) => ({
        user_doc_unique: unique().on(table.userId, table.documentId),
    })
);
