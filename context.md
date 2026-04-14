# 🧠 Claude Code Context — E-merch Brief Builder

## 🎯 Project Overview

We are building an **internal web application** for an e-commerce team to replace PowerPoint-based briefs with a **visual editor + structured export system**.

### Goals

* Allow **non-technical e-merch users** to create content visually
* Eliminate manual HTML/CSS editing
* Enable developers to **export clean, standardized HTML/CSS**
* Reduce errors and save time

This is an **internal productivity tool**, not a public SaaS.

---

## 🧱 Core Concept

A **Brief** represents a **weekly publication** for a given language.

Example:

* `2026-wk17-fr-1`

Each brief contains multiple **sections**, where each section corresponds to a **template**:

* Macarons
* MEA (future)
* Other templates (future)

---

## 🏗️ Tech Stack

* **Framework**: Next.js (App Router)
* **UI**: Tailwind CSS + shadcn/ui
* **Database**: Neon (PostgreSQL)
* **Hosting**: Vercel
* **Auth**: Neon Auth (simple internal authentication)
* **Image processing**: server-side (crop + resize)

---

## 📦 Data Model

### Brief

* `id` (UUID)
* `slug` (string, ex: `2026-wk17-fr-1`)
* `year` (number)
* `week` (number)
* `locale` (string: `fr`, `es`, etc.)
* `index` (number, increment per week + locale)
* `status` (`draft`, `published`, `treated`)
* `created_at`
* `updated_at`

### BriefSection

* `id`
* `brief_id` (FK)
* `type` (`macarons`, `mea`, etc.)
* `order` (integer)
* `content` (JSON)
* `created_at`
* `updated_at`

### Asset

* `id`
* `url` (final optimized image)
* `label` (used for search)
* `created_at`

---

## 🌍 Multi-language System

* Briefs are **fully independent per language**
* No shared content between languages
* Users can **duplicate a brief from another language**

Example:

* Duplicate `2026-wk17-fr-1` → `2026-wk17-es-1`

---

## 🧩 Templates System

Templates are **hardcoded by developers**.

Each template defines:

* fields
* constraints
* layout
* export logic (HTML/CSS)

### V1 Scope

* Only implement **Macarons template**

---

## 🍪 Macarons Template (V1)

### Constraints

* Maximum 9 items
* Label must be lowercase
* Max 16 characters (including spaces)
* Image displayed inside a circular container

### Item Structure

Each macaron item contains:

* `label` (string)
* `link` (string)
* `image` (asset)
* optional flags (future use)

### Features

* Drag & drop to reorder items
* Toggle visibility of items
* Live preview

---

## 🖼️ Image Handling

Users can:

1. Drag & drop an image
2. Select an image from a media library

### Workflow

* Upload image
* Crop and resize inside a fixed container (e.g. circle)
* Save only the **final optimized image**
* Store as an Asset

⚠️ Original image is NOT stored (MVP decision)

### Media Library

* Search by label
* Reuse existing assets

---

## ✏️ Editor UX

### User Flow

* Create or duplicate a brief
* Select year / week / locale
* Add/edit sections
* Fill content using a visual UI
* Save (draft)
* Publish when ready

### Sections

* Can be reordered
* Edited independently

---

## 🔄 Status Workflow

* `draft` → being edited
* `published` → ready for developers
* `treated` → processed and integrated into CMS

---

## 📤 Export System

### Goal

Allow developers to copy code directly from the app.

### Requirements

* Generate **clean HTML/CSS output**
* Display in a **readonly code block**
* Include a **copy button**
* No file download required

### Export Types

* Per section (e.g. macarons)
* Full brief export (future)

### Important Rule

Users NEVER write code manually.
All HTML/CSS is generated from structured data.

---

## 📚 MVP Scope

Must include:

* Basic authentication
* Create/edit briefs
* Multi-language separation
* Duplicate brief
* Macarons template
* Drag & drop reorder
* Image upload + crop
* Basic media library (search)
* Status system
* HTML export (copyable)

---

## 🚫 Out of Scope (V1)

* MEA template
* Advanced permissions
* FTP / WinSCP integration
* Version history
* Dynamic template builder
* Complex layout builder

---

## 🧠 Key Principles

* No free editing → everything is structured
* Templates controlled by developers
* Output must always be valid and consistent
* UX must be simple for non-technical users
* Focus on speed and reliability over flexibility

---

## ⚠️ Important Design Philosophy

This project is essentially a **specialized internal CMS**.

Avoid:

* Over-flexibility
* Free layout systems
* User-controlled structure

Prefer:

* Strict templates
* Controlled inputs
* Predictable output

Start simple, then iterate based on real usage.