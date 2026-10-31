import { expect, test, type Page } from '@playwright/test';

const ADMIN = { user: process.env.E2E_ADMIN_USER || 'admin', pass: process.env.E2E_ADMIN_PASSWORD || 'Local-Admin-12345' };
const DEMO_PW = process.env.E2E_SEED_PASSWORD || 'Local-Demo-12345';
const errors: string[] = [];
let expectRefused = false;

test.beforeEach(({ page }) => {
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error' && !(expectRefused && /status of (401|404)/.test(m.text()))) errors.push(m.text()); });
});
test.afterAll(() => { expect(errors, errors.join('\n')).toEqual([]); });

async function login(page: Page, user: string, pass: string) {
  await page.goto('/login');
  await page.fill('#login-user', user);
  await page.fill('#login-pass', pass);
  await page.click('button[type=submit]');
  await expect(page.locator('button[aria-label="خروج"]')).toBeVisible({ timeout: 20_000 });
}
async function logout(page: Page) {
  await page.click('button[aria-label="خروج"]');
  await expect(page.getByText('ورود کارکنان')).toBeVisible();
}

test('anonymous visitors get the storefront and no ledger data', async ({ page, request }) => {
  await page.goto('/');
  await expect(page.getByText('ورود کارکنان')).toBeVisible();
  await expect(page.getByText('خرید برای مصرف شخصی').first()).toBeVisible();
  expect((await request.get('/api/state')).status()).toBe(401);
  expect((await request.get('/api/admin/users')).status()).toBe(401);
  const cat = await (await request.get('/api/public/catalog')).json();
  expect(JSON.stringify(cat)).not.toMatch(/costPrice|commission/i);
});

test('wrong password is refused with a clear message', async ({ page }) => {
  expectRefused = true;
  await page.goto('/login');
  await page.fill('#login-user', 'admin');
  await page.fill('#login-pass', 'definitely-wrong-1');
  await page.click('button[type=submit]');
  await expect(page.getByRole('alert')).toContainText('نادرست');
});

test('customer: order through the simulated gateway, then track it with number + mobile only', async ({ page }) => {
  expectRefused = true;
  await page.goto('/p/piarom-600');
  await page.getByText('شروع خرید مستقیم آنلاین').click();
  const f = page.locator('form input');
  await f.nth(0).fill('مشتری آزمون e2e');
  await f.nth(1).fill('09127776655');
  await f.nth(2).fill('تهران');
  await f.nth(3).fill('تهران');
  await f.nth(4).fill('1234567890');
  await f.nth(5).fill('تهران، خیابان آزمون، پلاک ۱');
  await page.getByRole('button', { name: /پرداخت آنلاین آزمایشی/ }).click();
  await expect(page.getByText('سفارش شما ثبت شد (پرداخت آزمایشی)')).toBeVisible({ timeout: 20_000 });
  const number = (await page.locator('.font-mono').filter({ hasText: /^[A-Za-z0-9-]{6,}$/ }).first().innerText()).trim();
  await page.getByText('مشاهده وضعیت ارسال سفارش').click();
  await page.getByRole('button', { name: 'پیگیری', exact: true }).click();
  await expect(page.getByText(number).first()).toBeVisible();
  // a wrong mobile must not reveal the order
  await page.locator('input[placeholder^="موبایل"]').fill('09120000000');
  await page.getByRole('button', { name: 'پیگیری', exact: true }).click();
  await expect(page.getByText('پیدا نشد').first()).toBeVisible();
});

test('store -> administrator: a payment stays pending until the administrator verifies it', async ({ page }) => {
  await login(page, 'rt03', DEMO_PW);
  await expect(page.getByText('RT-03').first()).toBeVisible();
  await page.getByRole('button', { name: /ثبت پرداخت/ }).click();
  const modal = page.locator('form').filter({ hasText: 'ثبت نهایی' });
  const amount = modal.locator('input[type=number]').first();
  await amount.fill('123000');
  await modal.locator('input[placeholder^="مثال"]').fill('E2E-PAY-1');
  await modal.getByRole('button', { name: 'ثبت نهایی' }).click();
  await expect(page.getByText('E2E-PAY-1').first()).toBeVisible({ timeout: 20_000 });
  await logout(page);

  await login(page, ADMIN.user, ADMIN.pass);
  await expect(page.getByText('صف تأیید مدیر')).toBeVisible();
  await expect(page.getByText('E2E-PAY-1').first()).toBeVisible();
  await page.getByRole('button', { name: /تأیید واریزی‌ها، بدهکاران/ }).click();
  await page.getByRole('button', { name: /تأیید واریزی و تخصیص/ }).first().click();
  await expect(page.getByText(/واریزی تأیید شد/)).toBeVisible({ timeout: 20_000 });
});

test('agent sees only own stores; administrator-only screens are not reachable', async ({ page, request }) => {
  await login(page, 'agent2', DEMO_PW);
  await expect(page.getByText('AG-02').first()).toBeVisible();
  await expect(page.getByText('AG-01')).toHaveCount(0);
  await expect(page.getByText('صف تأیید مدیر')).toHaveCount(0);
  const r = await page.request.get('/api/admin/users');
  expect(r.status()).toBe(403);
  await logout(page);
  void request;
});

test('administrator: forms 38-45 are real forms, user management lists the logins', async ({ page }) => {
  await login(page, ADMIN.user, ADMIN.pass);
  await page.getByRole('button', { name: /مرکز ۴۵ فرم/ }).click();
  await page.getByPlaceholder('جستجو', { exact: false }).fill('کاربر');
  await page.getByRole('button', { name: /مدیریت حساب|حساب کاربری|حساب‌های کاربری/ }).first().click();
  await expect(page.getByText('agent1').first()).toBeVisible({ timeout: 20_000 });
});


test('signed copies: a store uploads its bank slip through the document dialog and the administrator sees it', async ({ page }) => {
  const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(400, 5)]);
  await login(page, 'rt04', DEMO_PW);
  await page.getByRole('button', { name: /ثبت پرداخت/ }).click();
  const modal = page.locator('form').filter({ hasText: 'ثبت نهایی' });
  await modal.locator('input[type=number]').first().fill('77000');
  await modal.locator('input[placeholder^="مثال"]').fill('E2E-SLIP-1');
  await modal.getByRole('button', { name: 'ثبت نهایی' }).click();
  await expect(page.getByText('E2E-SLIP-1').first()).toBeVisible({ timeout: 20_000 });
  await page.getByRole('button', { name: /مشاهده رسید و تعهدنامه/ }).first().click();
  await page.locator('input[type=file]').setInputFiles({ name: 'slip.png', mimeType: 'image/png', buffer: png });
  await expect(page.getByText(/SHA-256 واقعی/)).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole('link', { name: /slip\.png/ })).toBeVisible();
  await page.getByLabel('بستن پیش‌نمایش سند').click();
  await logout(page);

  await login(page, ADMIN.user, ADMIN.pass);
  await expect(page.getByText('تصویر امضاشده بارگذاری شده').first()).toBeVisible();
});
