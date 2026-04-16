import {
  pgTable,
  uuid,
  varchar,
  integer,
  text,
  jsonb,
  boolean,
  timestamp,
  pgEnum,
} from "drizzle-orm/pg-core";

export const briefStatusEnum = pgEnum("brief_status", [
  "draft",
  "published",
  "treated",
]);

export const briefs = pgTable("briefs", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: varchar("slug", { length: 64 }).notNull().unique(),
  year: integer("year").notNull(),
  week: integer("week").notNull(),
  locale: varchar("locale", { length: 5 }).notNull(),
  index: integer("index").notNull(),
  status: briefStatusEnum("status").notNull().default("draft"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const briefSections = pgTable("brief_sections", {
  id: uuid("id").defaultRandom().primaryKey(),
  briefId: uuid("brief_id")
    .notNull()
    .references(() => briefs.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 32 }).notNull(),
  order: integer("order").notNull().default(0),
  content: jsonb("content").notNull().default({}),
  visible: boolean("visible").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const assets = pgTable("assets", {
  id: uuid("id").defaultRandom().primaryKey(),
  url: text("url").notNull(),
  label: varchar("label", { length: 255 }).notNull().default(""),
  mimeType: varchar("mime_type", { length: 64 }).notNull().default("image/png"),
  year: integer("year"),
  week: integer("week"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
