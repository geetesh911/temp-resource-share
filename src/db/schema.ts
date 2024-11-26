import { pgTable, uuid, varchar, timestamp, boolean } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const users = pgTable('users', {
    id: uuid('id').defaultRandom().primaryKey(),
    name: varchar('name').notNull(),
    email: varchar('email').notNull().unique(),
    password: varchar('password').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const resources = pgTable('resources', {
    id: uuid('id').defaultRandom().primaryKey(),
    name: varchar('name').notNull(),
    resourceUrl: varchar('resource_url').notNull(),
    accessToken: varchar('access_token').notNull().unique(),
    expirationTime: timestamp('expiration_time').notNull(),
    isExpired: boolean('is_expired').default(false).notNull(),
    ownerId: uuid('owner_id')
        .notNull()
        .references(() => users.id),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    deletedAt: timestamp('deleted_at'),
    // New fields for file support
    fileKey: varchar('file_key'),
    fileName: varchar('file_name'),
    fileSize: varchar('file_size'),
    mimeType: varchar('mime_type'),
});

export const usersRelations = relations(users, ({ many }) => ({
    resources: many(resources),
}));

export const resourcesRelations = relations(resources, ({ one }) => ({
    owner: one(users, {
        fields: [resources.ownerId],
        references: [users.id],
    }),
}));

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Resource = typeof resources.$inferSelect;
export type NewResource = typeof resources.$inferInsert;
