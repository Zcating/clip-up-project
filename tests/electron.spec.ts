import { test, expect, _electron as electron } from '@playwright/test';

test.describe('Electron E2E 测试', () => {
  test('应用窗口正常启动并显示主界面', async () => {
    const electronApp = await electron.launch({
      args: ['.'],
    });

    const window = await electronApp.firstWindow();
    await window.waitForLoadState('domcontentloaded');

    const title = await window.title();
    console.log('窗口标题:', title);

    await expect(window.getByRole('heading', { name: '批量导入视频' })).toBeVisible();

    await electronApp.close();
  });

  test('选择视频文件按钮存在且可点击', async () => {
    const electronApp = await electron.launch({
      args: ['.'],
    });

    const window = await electronApp.firstWindow();
    await window.waitForLoadState('domcontentloaded');

    const importButton = window.getByRole('button', { name: '选择视频文件' });
    await expect(importButton).toBeVisible();
    await expect(importButton).toBeEnabled();

    await electronApp.close();
  });

  test('空状态提示显示正确', async () => {
    const electronApp = await electron.launch({
      args: ['.'],
    });

    const window = await electronApp.firstWindow();
    await window.waitForLoadState('domcontentloaded');

    await expect(window.getByText('点击上方按钮选择视频文件')).toBeVisible();
    await expect(window.getByText('支持 MP4, AVI, MOV, MKV, WMV, FLV, WebM 等格式')).toBeVisible();

    await electronApp.close();
  });

  test('文件计数显示正确', async () => {
    const electronApp = await electron.launch({
      args: ['.'],
    });

    const window = await electronApp.firstWindow();
    await window.waitForLoadState('domcontentloaded');

    await expect(window.getByText('已选择 0 个视频文件')).toBeVisible();

    await electronApp.close();
  });

  test('批量色彩还原区域显示正确', async () => {
    const electronApp = await electron.launch({
      args: ['.'],
    });

    const window = await electronApp.firstWindow();
    await window.waitForLoadState('domcontentloaded');

    await expect(window.getByRole('heading', { name: '批量色彩还原' })).toBeVisible();
    await expect(window.getByRole('button', { name: '选择输出目录' })).toBeVisible();
    await expect(window.getByRole('button', { name: '开始批量转换' })).toBeVisible();

    await electronApp.close();
  });
});
