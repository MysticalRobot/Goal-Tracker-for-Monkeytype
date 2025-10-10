import icon from './assets/icon.js';

// modifies the icon svg with the theme's colors and creates a data URI to use it
function getIconURI(theme: Theme): string {
  const mainColor = /e2b714/g;
  const bgColor = /323437/g;
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
  const themesKey: keyof BrowserStorage = 'themes';
  try {
    const themesContainer = await browser.storage.local.get(themesKey);
    const initializeThemes = !Object.hasOwn(themesContainer, themesKey);
    const themes: Map<number, Theme> & BrowserStorage[keyof BrowserStorage]
      = initializeThemes ? new Map<number, Theme>() : themesContainer.themes;
    themes.set(tab.id, theme);
    await browser.storage.local.set({ themes });
    await browser.action.setIcon({ path: iconDataURI, tabId: tab.id });
    return { success: true, message: 'icon updated' };
  } catch (error) {
    return { success: false, message: 'failed to update icon, ' + error };
  }
}

function getYearMonthDay(date: Date): [number, number, number] {
  return [date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()];
}

function getSecondsSinceStartOfDay(date: Date): number {
  return date.getUTCHours() * 60 * 60
    + date.getUTCMinutes() * 60
    + date.getUTCSeconds()
    + date.getUTCMilliseconds() / 1000;
}

async function saveTimeTypingMessageHandler(message: SaveTypingTypingMessage,
  sender: browser.runtime.MessageSender): Promise<MessageResponse> {
  console.debug('recieved saveTimeTypingMessage');
  const success = {
    success: true,
    message: `saved ${message.timeTypingSeconds.duration} seconds of timeTyping`
  };
  const timeTypingTodaySecondsKey: keyof BrowserStorage = 'timeTypingTodaySeconds';
  const timeTypingHistoryMinutesKey: keyof BrowserStorage = 'timeTypingHistoryMinutes';
  try {
    const timeTypingTodaySecondsContainer =
      await browser.storage.local.get(timeTypingTodaySecondsKey);
    const initializeTimeTypingToday =
      !Object.hasOwn(timeTypingTodaySecondsContainer, timeTypingTodaySecondsKey);
    let timeTypingTodaySeconds: TimeTyping & BrowserStorage[keyof BrowserStorage];
    if (initializeTimeTypingToday) {
      timeTypingTodaySeconds = message.timeTypingSeconds;
      await browser.storage.local.set({ timeTypingTodaySeconds });
      return success;
    }
    const timeTypingHistoryMinutesContainer
      = await browser.storage.local.get(timeTypingHistoryMinutesKey);
    const initializeTimeTypingHistory
      = !Object.hasOwn(timeTypingHistoryMinutesContainer, timeTypingHistoryMinutesKey);
    const timeTypingHistoryMinutes: Array<TimeTyping> & BrowserStorage[keyof BrowserStorage]
      = initializeTimeTypingHistory ? [] : timeTypingHistoryMinutesContainer.timeTypingHistoryMinutes;
    const [year1, month1, day1]
      = getYearMonthDay(timeTypingTodaySecondsContainer.timeTypingTodaySeconds.date);
    const [year2, month2, day2] = getYearMonthDay(message.timeTypingSeconds.date);
    const secondsSinceStartOfDay: number
      = getSecondsSinceStartOfDay(message.timeTypingSeconds.date);
    const timeTypingYesterdaySeconds
      = (secondsSinceStartOfDay - message.timeTypingSeconds.duration) * -1;
    if (year1 == year2 && month1 == month2 && day1 == day2) {
      timeTypingTodaySeconds = timeTypingTodaySecondsContainer.timeTypingTodaySeconds;
      timeTypingTodaySeconds.duration += message.timeTypingSeconds.duration;
    } else if (year1 === year2 && month1 === month2 && day1 == day2 - 1
      && timeTypingYesterdaySeconds > 0) {
      timeTypingTodaySeconds = {
        date: message.timeTypingSeconds.date,
        duration: message.timeTypingSeconds.duration - timeTypingYesterdaySeconds
      };
      const timeTypingYesterdayMinutes: TimeTyping = {
        date: timeTypingTodaySecondsContainer.timeTypingTodaySeconds.date,
        duration: Math.floor((timeTypingTodaySecondsContainer.timeTypingTodaySeconds.duration
          + timeTypingYesterdaySeconds) / 60)
      };
      timeTypingHistoryMinutes.push(timeTypingYesterdayMinutes);
    } else {
      timeTypingTodaySeconds = message.timeTypingSeconds;
      const timeTypingYesterdayMinutes: TimeTyping = {
        date: timeTypingTodaySecondsContainer.timeTypingTodaySeconds.date,
        duration: Math.floor(timeTypingTodaySecondsContainer.timeTypingTodaySeconds.duration / 60)
      };
      timeTypingHistoryMinutes.push(timeTypingYesterdayMinutes);
    }
    await browser.storage.local.set({ timeTypingTodaySeconds });
    await browser.storage.local.set({ timeTypingHistoryMinutes });
    return success;
  } catch (error) {
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
      return saveTimeTypingMessageHandler(message as SaveTypingTypingMessage, sender);
    case 'updateStreaks':
      break;
    case 'checkLoginStatus':
      break;
    case 'loadInfo':
      break;
  }
  return Promise.resolve({
    success: false,
    message: 'idk what happened; we gotta go bald',
  });
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
