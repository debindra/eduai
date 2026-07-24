'use strict';
const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const BASE = process.env.QA_BASE_URL || 'http://localhost:5173';
const PASS = process.env.DEMO_PASSWORD || 'DevPassword123!';
const OUT = path.join(__dirname, '..', 'screenshots', 'discovery-field-map.json');

async function dumpFields(page) {
  return page.evaluate(() => {
    const els = [];
    document
      .querySelectorAll(
        'input, select, textarea, button, a, [contenteditable], [role="button"], [role="link"]',
      )
      .forEach((el) => {
        if (el.offsetParent === null && getComputedStyle(el).position !== 'fixed') return;
        els.push({
          tag: el.tagName,
          type: el.type || '',
          name: el.name || '',
          id: el.id || '',
          placeholder: el.placeholder || '',
          text: (el.textContent || '').trim().substring(0, 60),
          href: el.getAttribute('href') || '',
          ariaLabel: el.getAttribute('aria-label') || '',
          role: el.getAttribute('role') || '',
          disabled: !!el.disabled,
        });
      });
    return els;
  });
}

async function login(page, identifier) {
  await page.goto(`${BASE}/login`);
  await page.waitForTimeout(500);
  await page.getByLabel('Username').fill(identifier);
  await page.getByLabel('Password').fill(PASS);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForTimeout(2500);
}

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();
  const map = {};

  await page.goto(`${BASE}/login`);
  await page.waitForTimeout(800);
  map['/login'] = {
    url: page.url(),
    fields: await dumpFields(page),
    bodyPreview: (await page.locator('body').innerText()).slice(0, 400),
  };
  console.log('OK /login');

  await login(page, 'teacher@schoolx.dev');
  console.log('Teacher landed:', page.url());

  const teacherPages = [
    '/teacher/sweep',
    '/teacher/calendar',
    '/teacher/attendance',
    '/teacher/weekly',
    '/teacher/lesson',
    '/teacher/pacing',
    '/teacher/reports',
    '/teacher/subject',
    '/teacher/oversight',
    '/teacher/remedial',
    '/teacher/messaging',
    '/teacher/manage',
    '/teacher/certification',
    '/teacher/community',
  ];
  for (const p of teacherPages) {
    await page.goto(`${BASE}${p}`);
    await page.waitForTimeout(1200);
    map[p] = {
      url: page.url(),
      h1: await page
        .locator('h1')
        .first()
        .textContent()
        .catch(() => null),
      fields: await dumpFields(page),
      bodyPreview: (await page.locator('body').innerText()).slice(0, 500),
    };
    console.log('OK', p, '->', page.url());
  }

  const signOut = page.getByRole('button', { name: /sign out|log out/i });
  if (await signOut.isVisible().catch(() => false)) {
    await signOut.click();
    await page.waitForTimeout(1200);
  }

  await login(page, 'admin@schoolx.dev');
  console.log('Admin landed:', page.url());

  const adminPages = [
    '/admin/dashboard',
    '/admin/calendar',
    '/admin/roster',
    '/admin/messaging',
    '/admin/manage',
    '/admin/remedial',
  ];
  for (const p of adminPages) {
    await page.goto(`${BASE}${p}`);
    await page.waitForTimeout(1200);
    map[p] = {
      url: page.url(),
      h1: await page
        .locator('h1')
        .first()
        .textContent()
        .catch(() => null),
      fields: await dumpFields(page),
      bodyPreview: (await page.locator('body').innerText()).slice(0, 500),
    };
    console.log('OK', p, '->', page.url());
  }

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(map, null, 2));
  console.log('Wrote', OUT);
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
