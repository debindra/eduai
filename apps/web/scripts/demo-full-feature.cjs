'use strict';

/**
 * EduAI Nepal — full-feature UI demo
 *
 * Storyboard (~2.5–3 min):
 *  1. Entry     — Teacher login
 *  2. Context   — Sweep overview + nav pan
 *  3. Action    — Propose sweep, attendance save, weekly adjust
 *  4. Variation — Lesson, pacing, reports, remedial, inbox
 *  5. Switch    — Admin login
 *  6. Result    — Dashboard, roster, calendar, manage
 *
 * Usage:
 *   node scripts/demo-full-feature.cjs --rehearse
 *   node scripts/demo-full-feature.cjs
 *
 * Env:
 *   QA_BASE_URL      default http://localhost:5173
 *   DEMO_PASSWORD    default DevPassword123!
 */

const { chromium } = require('@playwright/test');
const path = require('path');
const fs = require('fs');
const {
  reinjectOverlays,
  showSubtitle,
  ensureVisible,
  moveAndClick,
  typeSlowly,
  panElements,
  gotoWithOverlays,
} = require('./demo-helpers.cjs');

const BASE_URL = process.env.QA_BASE_URL || 'http://localhost:5173';
const PASS = process.env.DEMO_PASSWORD || 'DevPassword123!';
const TEACHER = 'teacher@schoolx.dev';
const ADMIN = 'admin@schoolx.dev';
const VIDEO_DIR = path.join(__dirname, '..', 'screenshots');
const OUTPUT_NAME = 'demo-full-feature.webm';
const REHEARSAL = process.argv.includes('--rehearse');

async function login(page, identifier, expectPath) {
  await gotoWithOverlays(page, `${BASE_URL}/login`);
  await typeSlowly(page, '#identifier', identifier, 'Username');
  await typeSlowly(page, '#password', PASS, 'Password', 25);
  await moveAndClick(page, 'button[type="submit"]', 'Sign in', { postClickDelay: 500 });
  await page.waitForURL(`**${expectPath}`, { timeout: 15000 });
  await page.waitForTimeout(1500);
  await reinjectOverlays(page);
}

/** Move cursor to nav link for storytelling, then hard-navigate for reliability. */
async function navTo(page, href, label, readySelector) {
  const link = page.locator(`nav a[href="${href}"]`).first();
  if (await link.isVisible().catch(() => false)) {
    try {
      await link.scrollIntoViewIfNeeded();
      const box = await link.boundingBox();
      if (box) {
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 8 });
        await page.waitForTimeout(400);
      }
    } catch (e) {
      console.warn(`WARNING: nav pan failed for "${label}": ${e.message}`);
    }
  }
  await gotoWithOverlays(page, `${BASE_URL}${href}`);
  if (readySelector) {
    await page.waitForSelector(readySelector, { timeout: 15000 });
  }
  await page.waitForTimeout(700);
}

async function runRehearsal(page) {
  let allOk = true;
  const check = async (locator, label) => {
    if (!(await ensureVisible(page, locator, label))) allOk = false;
  };

  await page.goto(`${BASE_URL}/login`);
  await page.waitForSelector('#identifier');
  await check('#identifier', 'Login username');
  await check('#password', 'Login password');
  await check('button[type="submit"]', 'Sign in');

  await page.locator('#identifier').fill(TEACHER);
  await page.locator('#password').fill(PASS);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL('**/teacher/sweep', { timeout: 15000 });
  await page.waitForSelector('button:has-text("Propose sweep")', { timeout: 15000 });

  const teacherChecks = [
    { label: 'Nav Sweep', selector: 'nav a[href="/teacher/sweep"]' },
    { label: 'Nav Attendance', selector: 'nav a[href="/teacher/attendance"]' },
    { label: 'Nav Weekly', selector: 'nav a[href="/teacher/weekly"]' },
    { label: 'Nav Lesson', selector: 'nav a[href="/teacher/lesson"]' },
    { label: 'Nav Pacing', selector: 'nav a[href="/teacher/pacing"]' },
    { label: 'Nav Reports', selector: 'nav a[href="/teacher/reports"]' },
    { label: 'Nav Remedial', selector: 'nav a[href="/teacher/remedial"]' },
    { label: 'Nav Inbox', selector: 'nav a[href="/teacher/messaging"]' },
    { label: 'Propose sweep', selector: 'button:has-text("Propose sweep")' },
    { label: 'Sign out', selector: 'button:has-text("Sign out")' },
  ];
  for (const step of teacherChecks) {
    await check(step.selector, step.label);
  }

  await page.goto(`${BASE_URL}/teacher/attendance`);
  await page.waitForTimeout(800);
  await check('select[aria-label="Status Aarav Sharma"]', 'Attendance status Aarav');
  await check('button:has-text("Save attendance")', 'Save attendance');

  await page.goto(`${BASE_URL}/teacher/weekly`);
  await page.waitForTimeout(800);
  await check('input[aria-label="Day date"]', 'Weekly day date');
  await check('input[aria-label="Theme"]', 'Weekly theme');
  await check('button:has-text("Save adjust")', 'Save adjust');

  await page.goto(`${BASE_URL}/teacher/reports`);
  await page.waitForTimeout(800);
  await check('select[aria-label="Child"]', 'Report child select');
  await check('button:has-text("Draft monthly report")', 'Draft monthly report');

  await page.getByRole('button', { name: 'Sign out' }).click();
  await page.waitForURL('**/login', { timeout: 10000 });

  await page.locator('#identifier').fill(ADMIN);
  await page.locator('#password').fill(PASS);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL('**/admin/dashboard', { timeout: 15000 });

  const adminChecks = [
    { label: 'Nav Dashboard', selector: 'nav a[href="/admin/dashboard"]' },
    { label: 'Nav Calendar', selector: 'nav a[href="/admin/calendar"]' },
    { label: 'Nav Roster', selector: 'nav a[href="/admin/roster"]' },
    { label: 'Nav Manage', selector: 'nav a[href="/admin/manage"]' },
  ];
  for (const step of adminChecks) {
    await check(step.selector, step.label);
  }

  await page.goto(`${BASE_URL}/admin/roster`);
  await page.waitForTimeout(800);
  await check('button:has-text("UKG A")', 'Roster UKG A section');

  await page.goto(`${BASE_URL}/admin/calendar`);
  await page.waitForTimeout(800);
  await check('button[aria-label="Next month"]', 'Calendar next month');

  if (!allOk) {
    console.error('REHEARSAL FAILED - fix selectors before recording');
    process.exit(1);
  }
  console.log('REHEARSAL PASSED - all selectors verified');
}

async function runRecording(page) {
  // --- 1. Entry ---
  await showSubtitle(page, 'Step 1 - Teacher sign-in');
  await login(page, TEACHER, '/teacher/sweep');
  await page.waitForSelector('button:has-text("Propose sweep")', { timeout: 15000 });
  await page.waitForTimeout(2500);

  // --- 2. Context: Sweep ---
  await showSubtitle(page, 'Step 2 - Milestone batch sweep');
  await panElements(page, 'nav[aria-label="Teacher"] a', 8);
  await page.waitForTimeout(1000);
  // Avoid opening native <select> popups (they block headless clicks).
  const ratingSelect = page.locator('select[aria-label="Rating for Aarav Sharma"]');
  try {
    const box = await ratingSelect.boundingBox();
    if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 10 });
      await page.waitForTimeout(500);
    }
  } catch (e) {
    console.warn('WARNING: rating hover:', e.message);
  }
  await ratingSelect.selectOption('developing', { timeout: 5000 }).catch((e) =>
    console.warn('WARNING: rating select:', e.message),
  );
  await page.waitForTimeout(800);
  await moveAndClick(page, 'button:has-text("Propose sweep")', 'Propose sweep', {
    postClickDelay: 2000,
  });
  await page.waitForTimeout(1500);

  // --- 3. Attendance ---
  await showSubtitle(page, 'Step 3 - Daily attendance');
  await navTo(
    page,
    '/teacher/attendance',
    'Nav Attendance',
    'button:has-text("Save attendance")',
  );
  const priyaStatus = page.locator('select[aria-label="Status Priya Thapa"]');
  if (await priyaStatus.isVisible().catch(() => false)) {
    try {
      const box = await priyaStatus.boundingBox();
      if (box) {
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 8 });
        await page.waitForTimeout(400);
      }
    } catch (e) {
      console.warn('WARNING: status hover:', e.message);
    }
    await priyaStatus.selectOption('late', { timeout: 5000 }).catch((e) =>
      console.warn('WARNING: attendance select:', e.message),
    );
    await page.waitForTimeout(600);
    await moveAndClick(page, 'button:has-text("Save attendance")', 'Save attendance', {
      postClickDelay: 2000,
    });
  } else {
    console.warn('WARNING: attendance controls missing — continuing');
    await page.waitForTimeout(1200);
  }

  // --- 4. Weekly ---
  await showSubtitle(page, 'Step 4 - Weekly plan adjust');
  await navTo(page, '/teacher/weekly', 'Nav Weekly', 'input[aria-label="Day date"]');
  // Save requires both date + theme (WeeklyPlanPage).
  const dayDate = page.locator('input[aria-label="Day date"]');
  if (await dayDate.isVisible().catch(() => false)) {
    await moveAndClick(page, dayDate, 'Day date', { postClickDelay: 400 });
    await dayDate.fill('2026-07-21');
    await page.waitForTimeout(400);
    await typeSlowly(page, 'input[aria-label="Theme"]', 'Animals & family', 'Theme');
    await page.waitForTimeout(600);
    const saveAdjust = page.locator('button:has-text("Save adjust")');
    if (await saveAdjust.isEnabled().catch(() => false)) {
      await moveAndClick(page, saveAdjust, 'Save adjust', { postClickDelay: 1800 });
    } else {
      console.warn('WARNING: Save adjust still disabled — showing filled form only');
      await page.waitForTimeout(1200);
    }
  } else {
    console.warn('WARNING: weekly form missing — continuing');
    await page.waitForTimeout(1200);
  }

  // --- 5. Lesson + Pacing ---
  await showSubtitle(page, 'Step 5 - Lesson & pacing');
  await navTo(page, '/teacher/lesson', 'Nav Lesson', 'h1');
  await page.waitForTimeout(1200);
  await navTo(page, '/teacher/pacing', 'Nav Pacing', 'h1');
  await page.evaluate(() => window.scrollTo({ top: 280, behavior: 'smooth' }));
  await page.waitForTimeout(1500);

  // --- 6. Reports ---
  await showSubtitle(page, 'Step 6 - Parent report review');
  await navTo(page, '/teacher/reports', 'Nav Reports', 'select[aria-label="Child"]');
  await moveAndClick(page, 'select[aria-label="Child"]', 'Child select', {
    postClickDelay: 800,
  });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(1200);

  // --- 7. Remedial + Inbox ---
  await showSubtitle(page, 'Step 7 - Remedial & inbox');
  await navTo(page, '/teacher/remedial', 'Nav Remedial', 'h1');
  await page.waitForTimeout(1000);
  await navTo(page, '/teacher/messaging', 'Nav Inbox', 'h1');
  await page.waitForTimeout(1200);

  // --- 8. Switch to admin ---
  await showSubtitle(page, 'Step 8 - Switch to admin');
  const signOut = page.locator('button:has-text("Sign out")');
  if (await signOut.isVisible().catch(() => false)) {
    await moveAndClick(page, signOut, 'Sign out', { postClickDelay: 1200 });
  }
  await gotoWithOverlays(page, `${BASE_URL}/login`);
  // Clear any leftover session storage before admin login.
  await page.evaluate(() => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {
      /* ignore */
    }
  });
  await gotoWithOverlays(page, `${BASE_URL}/login`);
  await login(page, ADMIN, '/admin/dashboard');
  await page.waitForTimeout(2500);

  // --- 9. Admin dashboard ---
  await showSubtitle(page, 'Step 9 - Compliance dashboard');
  await panElements(page, 'main h2, main h3, main p, main li', 6);
  await page.evaluate(() => window.scrollTo({ top: 320, behavior: 'smooth' }));
  await page.waitForTimeout(1800);

  // --- 10. Roster ---
  await showSubtitle(page, 'Step 10 - School roster');
  await navTo(page, '/admin/roster', 'Nav Roster', 'button:has-text("UKG A")');
  await moveAndClick(page, 'button:has-text("UKG A")', 'UKG A section', {
    postClickDelay: 2000,
  });
  await page.evaluate(() => window.scrollTo({ top: 200, behavior: 'smooth' }));
  await page.waitForTimeout(1500);

  // --- 11. Calendar ---
  await showSubtitle(page, 'Step 11 - Academic calendar');
  await navTo(page, '/admin/calendar', 'Nav Calendar', 'button[aria-label="Next month"]');
  await moveAndClick(page, 'button[aria-label="Next month"]', 'Next month', {
    postClickDelay: 1500,
  });
  await page.waitForTimeout(1200);

  // --- 12. Manage (result) ---
  await showSubtitle(page, 'Step 12 - School manage');
  await navTo(page, '/admin/manage', 'Nav Manage', 'h1');
  await page.evaluate(() => window.scrollTo({ top: 240, behavior: 'smooth' }));
  await page.waitForTimeout(2000);
  await showSubtitle(page, '');
  await page.waitForTimeout(2000);
}

(async () => {
  fs.mkdirSync(VIDEO_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });

  if (REHEARSAL) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const page = await context.newPage();
    try {
      await runRehearsal(page);
    } finally {
      await browser.close();
    }
    return;
  }

  const context = await browser.newContext({
    recordVideo: { dir: VIDEO_DIR, size: { width: 1280, height: 720 } },
    viewport: { width: 1280, height: 720 },
  });
  const page = await context.newPage();

  try {
    await reinjectOverlays(page);
    await runRecording(page);
  } catch (err) {
    console.error('DEMO ERROR:', err.message);
    throw err;
  } finally {
    await context.close();
    const video = page.video();
    if (video) {
      const src = await video.path();
      const dest = path.join(VIDEO_DIR, OUTPUT_NAME);
      try {
        fs.copyFileSync(src, dest);
        console.log('Video saved:', dest);
      } catch (e) {
        console.error('ERROR: Failed to copy video:', e.message);
        console.error('  Source:', src);
        console.error('  Destination:', dest);
      }
    }
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
