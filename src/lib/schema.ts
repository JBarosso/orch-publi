import {
  pgTable,
  uuid,
  varchar,
  integer,
  text,
  jsonb,
  boolean,
  timestamp,
  date,
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
  // Nom libre optionnel, affiché à la place du slug si renseigné — year/week/
  // locale/index (et le slug lui-même) restent inchangés, c'est purement un
  // alias d'affichage.
  name: varchar("name", { length: 128 }).notNull().default(""),
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
  title: varchar("title", { length: 128 }).notNull().default(""),
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

// Paramètres applicatifs clé/valeur (ex: durée de rétention)
export const settings = pgTable("settings", {
  key: varchar("key", { length: 64 }).primaryKey(),
  value: jsonb("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

// Glossaire de traduction global : une clé, une valeur par langue (jsonb)
export const translations = pgTable("translations", {
  id: uuid("id").defaultRandom().primaryKey(),
  key: varchar("key", { length: 128 }).notNull().unique(),
  values: jsonb("values").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

// Templates personnalisés : sections à champs libres réutilisables dans les
// briefs (snapshot indépendant à l'instanciation). Statuts : draft | published | archived
export const customTemplates = pgTable("custom_templates", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 128 }).notNull(),
  status: varchar("status", { length: 16 }).notNull().default("draft"),
  layout: varchar("layout", { length: 32 }).notNull().default("stack"),
  blocks: jsonb("blocks").notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

// Bibliothèque d'items de bannière "Global header" : réutilisables par
// label, snapshot indépendant à la sélection dans une section (même
// principe que customTemplates ci-dessus).
export const globalHeaderItems = pgTable("global_header_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  // Un item n'a de sens que dans une langue (texte traduit) : la
  // bibliothèque est filtrée par la locale du brief en cours d'édition.
  locale: varchar("locale", { length: 5 }).notNull(),
  label: varchar("label", { length: 255 }).notNull(),
  text: text("text").notNull().default(""),
  linkType: varchar("link_type", { length: 16 }).notNull().default("none"),
  cgid: varchar("cgid", { length: 255 }).notNull().default(""),
  cid: varchar("cid", { length: 255 }).notNull().default(""),
  link: text("link").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

// Onglet "Programmation" : tableau purement informatif, des blocs (nom
// d'asset + période optionnelle) rangés en colonnes par pays.
export const programmationCountryEnum = pgEnum("programmation_country", [
  "FR",
  "BE",
  "ES",
  "GR",
]);

export const programmationBlocks = pgTable("programmation_blocks", {
  id: uuid("id").defaultRandom().primaryKey(),
  country: programmationCountryEnum("country").notNull(),
  label: varchar("label", { length: 255 }).notNull(),
  startDate: date("start_date", { mode: "string" }),
  endDate: date("end_date", { mode: "string" }),
  comment: text("comment").notNull().default(""),
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
  type: varchar("type", { length: 32 }).notNull().default("other"),
  label: varchar("label", { length: 255 }).notNull().default(""),
  mimeType: varchar("mime_type", { length: 64 }).notNull().default("image/png"),
  year: integer("year"),
  week: integer("week"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
