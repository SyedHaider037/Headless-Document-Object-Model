import { users } from "./user.schema.ts";
import { pgTable, uuid, varchar, text, jsonb, timestamp } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm"

export const documents = pgTable("documents", {
    id: uuid("id").primaryKey().defaultRandom(),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),
    tag: varchar("tag", { length: 100 }).notNull(),
    filepath: varchar("filepath", { length: 512 }).notNull(),
    uploadedBy: uuid("uploadedBy").references(() => users.id).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
})

export const documentsRelations = relations(documents, ({ one }) => ({
  uploadedby: one(users, {
    fields: [documents.uploadedBy],
    references: [users.id],
  }),
}));