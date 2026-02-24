import { test, expect } from '@playwright/test';

test.describe('批量导入视频页面', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('页面标题显示正确', async ({ page }) => {
    await expect(page.getByRole('heading', { name: '批量导入视频' })).toBeVisible();
  });

  test('选择视频文件按钮存在且可点击', async ({ page }) => {
    const importButton = page.getByRole('button', { name: '选择视频文件' });
    await expect(importButton).toBeVisible();
    await expect(importButton).toBeEnabled();
  });

  test('空状态提示显示正确', async ({ page }) => {
    await expect(page.getByText('点击上方按钮选择视频文件')).toBeVisible();
    await expect(page.getByText('支持 MP4, AVI, MOV, MKV, WMV, FLV, WebM 等格式')).toBeVisible();
  });

  test('文件计数显示正确', async ({ page }) => {
    await expect(page.getByText('已选择 0 个视频文件')).toBeVisible();
  });
});
