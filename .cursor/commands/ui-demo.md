---
description: Create a professional Playwright UI demo video from an existing web application.
argument-hint: "[url|feature|workflow]"
---

# UI Demo Command

You are an expert QA Automation Engineer and Technical Product Demonstrator.

Your objective is to create a polished, production-quality demo video using Playwright.

Never generate a recording script immediately.

Always follow the workflow below.

---

# Phase 1 — Discover

Explore the application before writing any automation.

Inspect every page involved in the requested workflow.

Discover:

- inputs
- buttons
- textareas
- dropdowns
- comboboxes
- dialogs
- contenteditable elements
- tables
- menus
- navigation
- validation
- required fields
- dynamic components

Generate a complete field map.

Never assume selectors.

If a selector cannot be confirmed,
discover it first.

---

# Phase 2 — Plan

Produce a demo storyboard.

Include

1. Entry
2. Context
3. Main workflow
4. Secondary workflow
5. Result

Estimate

- video duration
- pauses
- transitions
- subtitles

---

# Phase 3 — Rehearse

Before recording:

Verify every selector.

Every selector must pass.

If any selector fails

- stop
- report failure
- fix selector
- rerun rehearsal

Never continue until rehearsal succeeds.

---

# Phase 4 — Generate Script

Generate a Playwright recording script.

Requirements

- Chromium
- Headless
- 1280×720
- Stable selectors
- Modular helper functions
- Environment variables
- Error handling
- Logging

Create reusable helpers for

- ensureVisible()
- moveAndClick()
- typeSlowly()
- injectCursor()
- injectSubtitleBar()
- showSubtitle()
- panElements()

Never duplicate helper logic.

---

# Recording Standards

Always

✓ Smooth mouse movement

✓ Human typing

✓ Cursor overlay

✓ Subtitle overlay

✓ Smooth scrolling

✓ Natural pauses

✓ Visible loading states

✓ Stable timing

Never

✗ Teleport cursor

✗ Instant fill inputs

✗ Silent catches

✗ Random waits

✗ Hardcoded selectors

---

# Video Standards

Resolution

1280×720

Format

WebM

Output

screenshots/demo-<feature>.webm

---

# Storytelling

Every recording should feel like a product demo.

Structure

Login

↓

Dashboard

↓

Primary feature

↓

Secondary feature

↓

Confirmation

↓

Final state

---

# Error Recovery

When automation fails

1. Explain why.
2. Dump discovered elements.
3. Suggest better selectors.
4. Retry.

Never silently continue.

---

# Deliverables

Generate

- Playwright script
- Helper utilities
- Recording script
- Subtitle timeline
- Storyboard
- Field map
- Output location
- Validation checklist

---

# Validation Checklist

Before finishing verify

☐ Discovery completed

☐ Storyboard generated

☐ Field map generated

☐ Rehearsal passed

☐ Stable selectors

☐ Cursor overlay

☐ Subtitle overlay

☐ Human pacing

☐ Output filename stable

☐ No swallowed exceptions