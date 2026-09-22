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

// Verrou d'édition d'un brief (cf. src/lib/brief-lock.ts), une ligne au plus
// par brief. Table à part plutôt que colonnes sur `briefs` : le signe de vie
// toutes les 30 s y ferait bouger `briefs.updatedAt` en permanence.
export const briefLocks = pgTable("brief_locks", {
  briefId: uuid("brief_id")
    .primaryKey()
    .references(() => briefs.id, { onDelete: "cascade" }),
  // Anonyme : empreinte de la session qui tient le verrou, jamais le jeton brut.
  lockedBy: varchar("locked_by", { length: 64 }).notNull(),
  // Pose du verrou : point de départ de la durée maximale (Paramétrage).
  lockedAt: timestamp("locked_at", { withTimezone: true }).notNull(),
  // Dernier signe de vie de l'onglet : sans nouvelles depuis quelques
  // minutes (onglet planté, portable en veille), le verrou est libre.
  heartbeatAt: timestamp("heartbeat_at", { withTimezone: true }).notNull(),
});

// Pages du site (HP, HP cat bébé...) et, pour chacune, l'identifiant de
// l'asset Salesforce où coller le code de chaque type de section — même
// modèle que l'onglet Traduction (une ligne par clé, une valeur par colonne).
// Commun à toutes les langues.
export const cmsPages = pgTable("cms_pages", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 128 }).notNull(),
  // { [type de section]: identifiant d'asset }
  assets: jsonb("assets").notNull().default({}),
  // Page des sections qui n'en ont pas choisi (cf. defaultCmsPage).
  isDefault: boolean("is_default").notNull().default(false),
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
  // Page du site visée par cette section : l'asset CMS en est déduit. Un même
  // brief mélange des sections destinées à des pages différentes, d'où un
  // choix par section et non par brief. Page supprimée = retour à « aucune ».
  cmsPageId: uuid("cms_page_id").references(() => cmsPages.id, { onDelete: "set null" }),
  // Identifiant saisi à la main, prioritaire sur la déduction ("" = déduire).
  cmsAssetId: varchar("cms_asset_id", { length: 128 }).notNull().default(""),
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

// Bibliothèque de blocs Edito, même principe que globalHeaderItems : un bloc
// enregistré est rechargé comme snapshot dans une section, filtré par langue.
// L'image est mémorisée par son URL de médiathèque seulement, jamais par son
// chemin CMS : rechargée, elle repart dans le ZIP du brief en cours comme
// n'importe quelle image choisie dans la médiathèque (le mécanisme « image
// d'une autre semaine » ignore l'année, un bloc réutilisé d'une année sur
// l'autre pointerait sinon vers un dossier CMS inexistant).
export const editoItems = pgTable("edito_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  locale: varchar("locale", { length: 5 }).notNull(),
  label: varchar("label", { length: 255 }).notNull(),
  theme: varchar("theme", { length: 32 }).notNull().default("aqua"),
  title: text("title").notNull().default(""),
  text: text("text").notNull().default(""),
  imageUrl: text("image_url").notNull().default(""),
  linkType: varchar("link_type", { length: 16 }).notNull().default("cgid"),
  cgid: varchar("cgid", { length: 255 }).notNull().default(""),
  cid: varchar("cid", { length: 255 }).notNull().default(""),
  link: text("link").notNull().default(""),
  buttons: jsonb("buttons").notNull().default([]),
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
  "BEFR",
  "BENL",
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
  // URL d'origine si l'image a été glissée depuis une appli web (ex: SharePoint)
  // — absent pour les uploads depuis le disque local.
  originUrl: text("origin_url"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
