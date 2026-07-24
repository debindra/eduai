# Assessment Pack Spec v1.1

**Status:** CURRENT — folds BidyaSetu Full System Report v3.3 9 dual-render
rule. Supersedes Assessment Pack Spec v1.0 where they conflict.

**Date:** 2026-07-24

---

## 1. Purpose

An Assessment Pack is the teacher's period-scoped assessment roadmap:
active milestones (pre-primary) or indicators/areas (G1–5), starter
activities, and band descriptors for the current calendar window.

## 2. Dual-render rule (standing, non-negotiable)

**One generation must produce two targets:**

| Target | Role |
|---|---|
| Interactive web pack | Review / sweep / roadmap surface (thin-channel rule) |
| Self-contained WhatsApp notification + PDF digest | Guaranteed delivery + portable copy usable **without** opening the web |

A teacher who never opens the web link must still be able to assess from the
WhatsApp digest alone. The WA message must **never** be a teaser that
requires the web to be useful.

This rule binds every future pack-shaped feature.

## 3. Digest minimum contents

- This period's active milestones / indicators (calendar-derived)
- Starter activities sufficient to run an observation
- Band / rating descriptors needed to place a state (not_yet/developing/
  can_do or 1–4)
- School name leading; no personality adjectives; no ranks

## 4. Generation constraints

- Pack **content placement** (what is active this month) is
  calendar-derived from `map_slices` / teaching days — deterministic.
- Activity *drafting* may use Haiku; teacher review still gates anything
  that becomes a confirmed child record.
- PDF render is deterministic template over pack rows (docgen path).
- Dual-render is a single pipeline with two adapters (web payload +
  messaging/PDF payload), not two independent generators that can drift.

## 5. Channel split

- WhatsApp = delivery certainty, awareness, portable copy
- Web = interactive roadmap and batch sweep

Logic never lives in a channel (thin-channel rule).

## 6. Open / deferred

- Full interactive web UI polish
- Production WhatsApp media upload for PDF
- G1–3 pack form layout gated on 2076 annex read
