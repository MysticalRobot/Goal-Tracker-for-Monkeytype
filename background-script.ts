import {
  getIconURI, getDailyGoalsMinutes, getNotificationFrequency, initialSyncStorage
} from './utils';
import type {
  BrowserSessionStorage, BrowserSyncStorage, Theme, TimeTyping, UpdateThemeMessage,
  SaveTimeTypingMessage, BackgroundScriptMessage, MessageResponse,
} from './types';

async function updateTheme(theme: Theme, tabId: number) {
  const themesKey: keyof BrowserSessionStorage = 'themes';
  const storage = await browser.storage.session.get(themesKey);
  const uninitializedThemes = !Object.hasOwn(storage, themesKey);
  type Themes = Array<[number, Theme]> & BrowserSessionStorage[keyof BrowserSessionStorage];
  const themes: Themes = uninitializedThemes ? [] : storage.themes;
  const prevMappingIndex = themes.findIndex((theme) => theme[0] == tabId);
  if (prevMappingIndex === -1) {
    themes.push([tabId, theme]);
  } else {
    themes[prevMappingIndex] = [tabId, theme];
  }
  await browser.storage.session.set({ themes });
}

async function updateThemeAndIcon(message: UpdateThemeMessage,
  sender: browser.runtime.MessageSender): Promise<MessageResponse> {
  const theme = message.theme;
  const tab = sender.tab;
  // this case probably will not happen 🤓
  if (tab === undefined) {
    return { success: false, message: 'UpdateIconMessage from closed tab ignored' };
  }
  if (tab.id === undefined) {
    return { success: false, message: 'failed to update theme, unable to get tab id' };
  }
  try {
    await updateTheme(theme, tab.id);
    const iconDataURI = getIconURI(theme);
    await browser.action.setIcon({ path: iconDataURI, tabId: tab.id });
    return { success: true, message: 'theme updated' };
  } catch (error) {
    return { success: false, message: 'failed to update theme, ' + error };
  }
}

function yearMonthDay(date: Date): [number, number, number] {
  return [date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()];
}

function areSameDay(date1: Date, date2: Date): boolean {
  const [year1, month1, day1] = yearMonthDay(date1);
  const [year2, month2, day2] = yearMonthDay(date2);
  return year1 == year2 && month1 == month2 && day1 == day2;
}

async function sendNotification(title: string, message: string): Promise<void> {
  const notificationId = await browser.notifications.create({
    type: 'basic',
    iconUrl: browser.runtime.getURL('./icon.svg'),
    title,
    message,
  });
  await browser.notifications.clear(notificationId);
}

async function notifyUser(prevTimeTypingToday: TimeTyping, currTimeTypingToday: TimeTyping): Promise<void> {
  const notificationFrequency = await getNotificationFrequency();
  if (notificationFrequency === 'never') {
    return;
  }
  const dailyGoalsMinutes = await getDailyGoalsMinutes();
  const dailyGoalsMinutesValues = Object.values(dailyGoalsMinutes);
  const dayOfWeek = currTimeTypingToday.date.getUTCDay();
  const dailyGoalMinutes = dailyGoalsMinutesValues.at(dayOfWeek);
  if (dailyGoalMinutes === undefined) {
    throw new Error(`daily goal for day ${dayOfWeek} is undefined`);
  }
  if (dailyGoalMinutes === 0) {
    return;
  }
  const prevProgressRatio = (prevTimeTypingToday.minutes / dailyGoalMinutes);
  const currProgressRatio = (currTimeTypingToday.minutes / dailyGoalMinutes);
  if (notificationFrequency === 'quarterGoalCompletion'
    && prevProgressRatio < 0.25 && 0.25 <= currProgressRatio) {
    await sendNotification('one quarter goal complete', 'the hardest part is over, keep it up!');
  } else if (notificationFrequency === 'quarterGoalCompletion'
    && prevProgressRatio < 0.75 && 0.75 <= currProgressRatio) {
    await sendNotification('three quarters goal complete', 'can you finish the job?');
  } else if ((notificationFrequency === 'quarterGoalCompletion'
    || notificationFrequency === 'halfGoalCompletion')
    && prevProgressRatio < 0.5 && 0.5 <= currProgressRatio) {
    await sendNotification('half goal complete', 'round 2, fight!');
  } else if (prevProgressRatio < 1.0 && 1.0 <= currProgressRatio) {
    await sendNotification('goal complete', 'absolute cinema');
  }
}

async function saveTimeTyping(timeTypingMinutes: number): Promise<[TimeTyping, TimeTyping]> {
  const timeTypingTodayKey: keyof BrowserSyncStorage = 'timeTypingToday';
  const storage = await browser.storage.sync.get(timeTypingTodayKey);
  const uninitializedTimeTypingToday = !Object.hasOwn(storage, timeTypingTodayKey);
  let currTimeTypingToday: TimeTyping;
  let prevTimeTypingToday: TimeTyping;
  const today = new Date();
  if (uninitializedTimeTypingToday
    || !areSameDay(new Date(storage.timeTypingToday.date), today)) {
    currTimeTypingToday = {
      date: today,
      minutes: timeTypingMinutes
    };
    prevTimeTypingToday = currTimeTypingToday;
  } else {
    currTimeTypingToday = storage.timeTypingToday;
    currTimeTypingToday.date = new Date(currTimeTypingToday.date);
    prevTimeTypingToday = { ...storage.timeTypingToday };
    currTimeTypingToday.minutes += timeTypingMinutes;
  }
  await browser.storage.sync.set({ timeTypingToday: currTimeTypingToday });
  return [prevTimeTypingToday, currTimeTypingToday];
}

async function saveTimeTypingAndNotifyUser(message: SaveTimeTypingMessage): Promise<MessageResponse> {
  try {
    const [prevTimeTypingToday, currTimeTypingToday] = await saveTimeTyping(message.timeTypingMinutes);
    await notifyUser(prevTimeTypingToday, currTimeTypingToday);
    return {
      success: true,
      message: `saved ${message.timeTypingMinutes} minutes of timeTyping`
    };
  } catch (error) {
    return { success: false, message: 'failed to save timeTyping or notify user, ' + error }
  }
}

// respond to messages from the content scripts
browser.runtime.onMessage.addListener((message: BackgroundScriptMessage,
  sender): Promise<MessageResponse> => {
  switch (message.action) {
    case 'updateTheme':
      return updateThemeAndIcon(message as UpdateThemeMessage, sender);
    case 'saveTimeTyping':
      return saveTimeTypingAndNotifyUser(message as SaveTimeTypingMessage);
    default:
      return Promise.resolve({
        success: false,
        message: 'we gotta go bald; unable to handle message, ' + message
      });
  }
});

browser.runtime.onInstalled.addListener(async (details) => {
  if (details.reason !== 'install') {
    return;
  }
  try {
    await browser.storage.sync.set(initialSyncStorage);
  } catch (error) {
    console.error('unable to initialize browser sync storage ', error);
  }
});
