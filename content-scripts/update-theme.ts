import { getIntervalManager } from '../utils.ts';
import type { Theme, UpdateThemeMessage, MessageResponse } from '../types';

// gets the colors that the current Monkeytype tab is using
const getTheme = (() => {
  // although the theme may change, this reference will not change
  const rootStyle = window.getComputedStyle(document.documentElement);
  return (): Theme => ({
    mainColor: rootStyle.getPropertyValue('--main-color'),
    bgColor: rootStyle.getPropertyValue('--bg-color'),
    subColor: rootStyle.getPropertyValue('--sub-color'),
    subAltColor: rootStyle.getPropertyValue('--sub-alt-color'),
    textColor: rootStyle.getPropertyValue('--text-color'),
    errorColor: rootStyle.getPropertyValue('--error-color'),
  })
})();

// sends a request to the bg script to update the Theme
const updateTheme = (() => {
  let theme: Theme | undefined = undefined;
  return async () => {
    const currentTheme = getTheme();
    if (theme !== undefined && currentTheme.bgColor === theme.bgColor 
        && currentTheme.mainColor === theme.mainColor) {
      return;
    }
    theme = currentTheme;
    const message: UpdateThemeMessage = { action: 'updateTheme', theme };
    try {
      const response: MessageResponse = await browser.runtime.sendMessage(message);
      if (!response.success) {
        console.error(response.message);
      }
    } catch (error) {
      console.error(error);
    }
  }
})();

// while the tab is active, periodically update the theme to account for custom theme selection 
const periodMs = 1000;
const intervalManager = getIntervalManager(updateTheme, periodMs);
document.addEventListener('visibilitychange', intervalManager);
intervalManager();

// update the theme upon the selection of a preset theme 
const styleSheetChangeObserver = new MutationObserver(updateTheme);
styleSheetChangeObserver.observe(document.body, { childList: true });

