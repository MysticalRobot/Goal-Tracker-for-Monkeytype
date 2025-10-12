import icon from './assets/icon.ts';

// modifies the icon svg with the theme's colors and creates a data URI to use it
function getIconURI(theme: Theme): string {
  const mainColor = /#e2b714/g;
  const bgColor = /#323437/g;
  const modifedIcon = icon
    .replace(mainColor, theme.mainColor)
    .replace(bgColor, theme.bgColor);
  return 'data:image/svg+xml;base64,' + window.btoa(modifedIcon);
}

async function updateIconMessageHandler(message: UpdateIconMessage,
  sender: browser.runtime.MessageSender): Promise<MessageResponse> {
  console.debug('recieved UpdateIconMessage');
  const theme = message.theme;
  const tab = sender.tab;
  // this case probably will not happen 🤓
  if (tab === undefined) {
    return {
      success: false,
      message: 'UpdateIconMessage from closed tab ignored'
    };
  }
  if (tab.id === undefined) {
    return {
      success: false,
      message: 'failed to update icon, unable to get tab id'
    };
  }
  const iconDataURI = getIconURI(theme);
  const themesKey: keyof BrowserSessionStorage = 'themes';
  try {
    const themesContainer = await browser.storage.session.get(themesKey);
    const initializeThemes = !Object.hasOwn(themesContainer, themesKey);
    const themes: Array<[number, Theme]> & BrowserSessionStorage[keyof BrowserSessionStorage]
      = initializeThemes ? [] : themesContainer.themes;
    const prevMappingIndex = themes.findIndex((theme) => theme[0] == tab.id);
    if (prevMappingIndex === -1) {
      themes.push([tab.id, theme]);
    } else {
      themes[prevMappingIndex] = [tab.id, theme];
    }
    await browser.storage.session.set({ themes });
    await browser.action.setIcon({ path: iconDataURI, tabId: tab.id });
    return { success: true, message: 'icon updated' };
  } catch (error) {
    return { success: false, message: 'failed to update icon, ' + error };
  }
}

function yearMonthDay(date: Date): [number, number, number] {
  return [date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()];
}

function compareDates(date1: Date, date2: Date): [boolean, boolean] {
  const [year1, month1, day1] = yearMonthDay(date1);
  const [year2, month2, day2] = yearMonthDay(date2);
  const sameYearAndMonth = year1 == year2 && month1 == month2;
  return [sameYearAndMonth && day1 == day2, sameYearAndMonth && day1 == day2 - 1];
}

function minutesSinceStartOfDay(date: Date): number {
  return date.getUTCHours() * 60
    + date.getUTCMinutes()
    + date.getUTCSeconds() / 60
    + date.getUTCMilliseconds() / (60 * 1000);
}

async function saveTimeTypingMessageHandler(message: SaveTimeTypingMessage): Promise<MessageResponse> {
  console.debug('recieved saveTimeTypingMessage');
  const success = {
    success: true,
    message: `saved ${message.timeTyping.minutes} minutes of timeTyping`
  };
  let syncedChanges;
  const storageSyncCallback = (changes: { [key: string]: any }) => (syncedChanges = changes);
  browser.storage.sync.onChanged.addListener(storageSyncCallback);
  const timeTypingTodayKey: keyof BrowserSyncStorage = 'timeTypingToday';
  const timeTypingHistoryKey: keyof BrowserSyncStorage = 'timeTypingHistory';
  try {
    const timeTypingTodayContainer = await browser.storage.sync.get(timeTypingTodayKey);
    // TODO should not have to do this bs if i initialize everything upon install
    const initializeTimeTypingToday =
      !Object.hasOwn(timeTypingTodayContainer, timeTypingTodayKey);
    let timeTypingToday: TimeTyping & BrowserSyncStorage[keyof BrowserSyncStorage];
    if (initializeTimeTypingToday) {
      timeTypingToday = message.timeTyping;
      await browser.storage.sync.set({ timeTypingToday });
      browser.storage.sync.onChanged.removeListener(storageSyncCallback);
      return success;
    }
    const timeTypingHistoryContainer = await browser.storage.sync.get(timeTypingHistoryKey);
    const initializeTimeTypingHistory = !Object.hasOwn(timeTypingHistoryContainer, timeTypingHistoryKey);
    const timeTypingHistory: Array<TimeTyping> & BrowserSyncStorage[keyof BrowserSyncStorage]
      = initializeTimeTypingHistory ? [] : timeTypingHistoryContainer.timeTypingHistory;
    const [sameDay, oneDayApart] = compareDates(new Date(timeTypingTodayContainer.timeTypingToday.date),
      message.timeTyping.date);
    const timeTypingYesterdayMinutes = (minutesSinceStartOfDay(message.timeTyping.date) - message.timeTyping.minutes) * -1;
    if (sameDay) {
      timeTypingToday = timeTypingTodayContainer.timeTypingToday;
      timeTypingToday.minutes += message.timeTyping.minutes;
    } else if (oneDayApart && timeTypingYesterdayMinutes > 0) {
      timeTypingToday = {
        date: message.timeTyping.date,
        minutes: message.timeTyping.minutes - timeTypingYesterdayMinutes
      };
      const timeTypingYesterday: TimeTyping = {
        date: timeTypingTodayContainer.timeTypingToday.date,
        minutes: timeTypingTodayContainer.timeTypingToday.minutes
          + timeTypingYesterdayMinutes
      };
      timeTypingHistory.push(timeTypingYesterday);
    } else {
      timeTypingToday = message.timeTyping;
      const timeTypingYesterday: TimeTyping = {
        date: timeTypingTodayContainer.timeTypingToday.date,
        minutes: timeTypingTodayContainer.timeTypingToday.minutes
      };
      timeTypingHistory.push(timeTypingYesterday);
    }
    console.log(JSON.stringify(timeTypingToday));
    await browser.storage.sync.set({ timeTypingToday });
    await browser.storage.sync.set({ timeTypingHistory });
    browser.storage.sync.onChanged.removeListener(storageSyncCallback);
    return success;
  } catch (error) {
    browser.storage.sync.onChanged.removeListener(storageSyncCallback);
    return {
      success: false, message: 'failed to save timeTyping, ' + error
    }
  }
}

// respond to requests from the content script to set the icon
browser.runtime.onMessage.addListener((message: Message,
  sender: browser.runtime.MessageSender): Promise<MessageResponse> => {
  // TODO fill in with the other functions
  switch (message.action) {
    case 'updateIcon':
      return updateIconMessageHandler(message as UpdateIconMessage, sender);
    case 'saveTimeTyping':
      return saveTimeTypingMessageHandler(message as SaveTimeTypingMessage);
    case 'loadInfo':
      break;
  }
  return Promise.resolve({
    success: false,
    message: 'we gotta go bald; unable to handle message, ' + message
  });
});

browser.runtime.onInstalled.addListener(async (details) => {
  if (details.reason !== 'install') {
    return;
  }
  const initialSyncStorage: BrowserSyncStorage = {
    timeTypingHistory: [],
    timeTypingToday: { date: new Date(), minutes: 0 },
    dailyGoal: {
      sunday: 0,
      monday: 0,
      tuesday: 0,
      wednesday: 0,
      thursday: 0,
      friday: 0,
      saturday: 0
    },
    username: '',
    apeKey: '',
    notificationFrequency: 'never'
  };
  try {
    await browser.storage.sync.set(initialSyncStorage);
  } catch (error) {
    console.error('unable to initialize sync storage ', error);
  }
});

// TODO create custom event(s) and listeners that fire and notify 
// respectively when the user hits certain milestones of their goal 

// const title = browser.i18n.getMessage('notificationTitle');
// const message = browser.i18n.getMessage('notificationContent', placeholder);
// browser.notifications.create({
//   type: 'basic',
//   iconUrl: browser.extension.getURL("icons/link-48.png"),
//   title: 'blah blah',
//   message: 'yass bitch'
// });
//
