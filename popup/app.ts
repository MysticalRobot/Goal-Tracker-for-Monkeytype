import { getNotificationFrequency, getDailyGoalsMinutes } from '../utils';
import type {
  BrowserSessionStorage, BrowserSyncStorage, Theme, TimeTyping, NotificationFrequency
} from '../types';
import { dayNames, notificationFrequencies } from '../types';

class ElementRetrievalError extends Error {
  constructor(elementName: string) {
    super();
    this.message = 'failed to get ' + elementName;
  }
}

class syncStorageRetrievalError extends Error {
  constructor(storageItemName: string) {
    super();
    this.message = `failed to retrieve ${storageItemName} from sync storage`;
  }
}

async function synchronizeThemeWithTab(tabId: number): Promise<void> {
  const defaultTheme = {
    mainColor: '#e2b714',
    bgColor: '#323437',
    subColor: '#646669',
    subAltColor: '#2c2e31',
    textColor: '#d1d0c5',
    errorColor: '#ca4754',
  };
  const rootStyle = document.documentElement.style;
  const themesKey: keyof BrowserSessionStorage = 'themes';
  const storage = await browser.storage.session.get(themesKey);
  if (!Object.hasOwn(storage, themesKey)) {
    return;
  }
  const themes: Array<[number, Theme]> = storage.themes;
  const themeMapping: [number, Theme] | undefined = themes.find((theme) => theme[0] === tabId);
  const theme = themeMapping === undefined ? defaultTheme : themeMapping[1];
  rootStyle.setProperty('--main-color', theme.mainColor);
  rootStyle.setProperty('--bg-color', theme.bgColor);
  rootStyle.setProperty('--sub-color', theme.subColor);
  rootStyle.setProperty('--sub-alt-color', theme.subAltColor);
  rootStyle.setProperty('--text-color', theme.textColor);
  rootStyle.setProperty('--error-color', theme.errorColor);
}

async function synchronizeThemeWithActiveTab(): Promise<void> {
  const tabs = await browser.tabs.query({ url: 'https://monkeytype.com/*', active: true });
  const tab = tabs.at(0);
  if (tab !== undefined && tab.id !== undefined) {
    await synchronizeThemeWithTab(tab.id);
  }
}

async function getDailyGoalsMinutesValues(): Promise<Array<number>> {
  const dailyGoalsMinutes = await getDailyGoalsMinutes();
  const dailyGoalsMinutesValues = Object.values(dailyGoalsMinutes);
  const allNumbers = dailyGoalsMinutesValues.every((goal) => typeof goal === 'number');
  if (dailyGoalsMinutesValues.length != dayNames.length || !allNumbers) {
    throw new syncStorageRetrievalError('dailyGoalsMinutes');
  }
  return dailyGoalsMinutesValues;
}

async function displayProgress(progressBar: HTMLProgressElement,
  dailyGoalsMinutesValues: Array<number>): Promise<void> {
  const timeTypingTodayKey: keyof BrowserSyncStorage = 'timeTypingToday';
  const storage = await browser.storage.sync.get(timeTypingTodayKey);
  const uninitializedTimeTypingToday = !Object.hasOwn(storage, timeTypingTodayKey);
  let timeTypingToday: TimeTyping & BrowserSyncStorage[keyof BrowserSyncStorage];
  if (uninitializedTimeTypingToday) {
    timeTypingToday = { date: new Date(), minutes: 0 };
    await browser.storage.sync.set({ timeTypingToday });
  } else {
    timeTypingToday = storage.timeTypingToday;
  }
  const dayOfWeek = new Date(timeTypingToday.date).getUTCDay();
  const dailyGoalMinutes = dailyGoalsMinutesValues.at(dayOfWeek);
  if (dailyGoalMinutes === undefined) {
    throw new Error(`daily goal for day ${dayOfWeek} is undefined`);
  }
  const maxProgressValue = 100;
  if (dailyGoalMinutes === 0) {
    progressBar.value = maxProgressValue;
  } else {
    const progressRatio = (timeTypingToday.minutes / dailyGoalMinutes);
    progressBar.value = Math.min(maxProgressValue, progressRatio * 100);
  }
}

async function displayDailyGoals(dailyGoalInputs: Array<HTMLInputElement>,
  dailyGoalsMinutesValues: Array<number>): Promise<void> {
  dailyGoalInputs.forEach((input, i) => {
    const dailyGoalMinutes = dailyGoalsMinutesValues.at(i);
    if (dailyGoalMinutes === undefined) {
      throw new Error('mismatch between counts of daily goal inputs and stored daily goal values');
    }
    input.value = dailyGoalMinutes.toString();
  });
}

function getDailyGoalsFormHandler(dailyGoalInputs: Array<HTMLInputElement>) {
  return async () => {
    const dailyGoalInputNames = dailyGoalInputs.map((input) => input.id);
    const correctNames = dayNames.every((name, i) => name === dailyGoalInputNames.at(i));
    if (!correctNames) {
      throw new Error('unexpected names inputs from daily goals form');
    }
    const validInputValues = dailyGoalInputs.every((input) => typeof parseInt(input.value) === 'number');
    if (!validInputValues) {
      throw new Error('daily goals form is submitting non-numerical values');
    }
    const dailyGoalsMinutesEntries: Array<[string, number]> = dailyGoalInputs.map(
      (input) => [input.id, parseInt(input.value)]
    );
    const dailyGoalsMinutes = Object.fromEntries(dailyGoalsMinutesEntries);
    await browser.storage.sync.set({ dailyGoalsMinutes });
  }
}

async function displayTogglePopupCommand(togglePopupCommand: HTMLSpanElement) {
  const extensionCommands = await browser.commands.getAll();
  const togglePopupCommandName = '_execute_action';
  const togglePopupCommandIndex = extensionCommands.findIndex(
    (command) => command.name === togglePopupCommandName
  );
  if (togglePopupCommandIndex === -1
    || extensionCommands[togglePopupCommandIndex] === undefined
    || extensionCommands[togglePopupCommandIndex].shortcut === undefined) {
    togglePopupCommand.innerText = 'something went wrong, failed to get command';
  } else {
    togglePopupCommand.innerText = extensionCommands[togglePopupCommandIndex].shortcut.toLocaleLowerCase();
  }
}

async function displayNotificationFrequency(notificationFrequencyButtons: Array<Element>) {
  const notificationFrequency = await getNotificationFrequency();
  const notificationFrequencyButton = notificationFrequencyButtons.find((button) => button.id === notificationFrequency);
  if (notificationFrequencyButton === undefined) {
    throw new Error('mismatch between stored notification frequency and notification frequency button id');
  }
  notificationFrequencyButton.setAttribute('data-checked', 'true');
}

function getNotificationFrequencyButtonHandler(button: Element) {
  return async () => {
    if (!notificationFrequencies.includes(button.id)) {
      throw new Error('unexpected id of notification frequency button');
    }
    const notificationFrequency = button.id as NotificationFrequency;
    await browser.storage.sync.set({ notificationFrequency });
  }
}

async function init() {
  try {
    browser.tabs.onActivated.addListener(async (activeInfo) => {
      await synchronizeThemeWithTab(activeInfo.tabId);
    });
    await synchronizeThemeWithActiveTab();

    const progressBar = document.getElementById('progressBar');
    if (progressBar === null || !(progressBar instanceof HTMLProgressElement)) {
      throw new ElementRetrievalError('progressBar');
    }
    const dailyGoalsMinutesValues = await getDailyGoalsMinutesValues();
    await displayProgress(progressBar, dailyGoalsMinutesValues);

    const dailyGoalInputs = Array.from(document.getElementsByClassName('dailyGoalInput'));
    const allInputElements = dailyGoalInputs.every((e) => e instanceof HTMLInputElement);
    if (dailyGoalInputs.length !== dayNames.length || !allInputElements) {
      throw new ElementRetrievalError('dailyGoalInputs');
    }
    await displayDailyGoals(dailyGoalInputs, dailyGoalsMinutesValues);

    const dailyGoalsForm = document.getElementById('dailyGoalsForm');
    if (dailyGoalsForm === null || !(dailyGoalsForm instanceof HTMLFormElement)) {
      throw new ElementRetrievalError('dailyGoalsForm');
    }
    dailyGoalsForm.addEventListener('submit', getDailyGoalsFormHandler(dailyGoalInputs));

    const popupToggleCommand = document.getElementById('popupToggleCommand');
    if (popupToggleCommand === null) {
      throw new ElementRetrievalError('popupToggleCommand');
    }
    await displayTogglePopupCommand(popupToggleCommand);

    const notificationFrequencyButtons = Array.from(document.getElementsByClassName('notificationFrequencyButton'));
    if (notificationFrequencyButtons.length !== notificationFrequencies.length) {
      throw new ElementRetrievalError('notificationFrequencyButtons');
    }
    await displayNotificationFrequency(notificationFrequencyButtons);
    notificationFrequencyButtons.forEach(
      (button) => button.addEventListener('click', getNotificationFrequencyButtonHandler(button))
    );

    const editPopupToggleCommandLink = document.getElementById('editPopupToggleCommandLink');
    if (editPopupToggleCommandLink === null) {
      throw new ElementRetrievalError('editPopupToggleCommandLink');
    }
    // TODO update for Chrome: chrome://extensions/shortcuts can be opened using tabs.create
    editPopupToggleCommandLink.addEventListener('click', async () => {
      browser.commands.openShortcutSettings();
    });

  } catch (error) {
    console.error(error);
  }
}

init();
