function createCalculateStreaksHandler(currentStreak: HTMLElement, bestStreak: HTMLElement) {
  return async () => {
    const timeTypingTodayKey: keyof BrowserSyncStorage = 'timeTypingToday';
    const timeTypingHistoryKey: keyof BrowserSyncStorage = 'timeTypingHistory';
    try {
      const timeTypingTodayContainer = await browser.storage.sync.get(timeTypingTodayKey);
      const timeTypingHistoryContainer = await browser.storage.sync.get(timeTypingHistoryKey);
      const timeTypingTodayExists = Object.hasOwn(timeTypingTodayContainer, timeTypingTodayKey);
      const timeTypingHistoryExists = Object.hasOwn(timeTypingHistoryContainer, timeTypingHistoryKey);
      if (timeTypingTodayExists) {
      }
      currentStreak.innerText = String(currentStreak);
      bestStreak.innerText = String(bestStreak);
    } catch (error) {
      console.error(error);
    }
  }
}

const matchThemeWithTab = (() => {
  const defaultTheme = {
    mainColor: '#e2b714',
    bgColor: '#323437',
    subColor: '#646669',
    textColor: '#d1d0c5',
    errorColor: '#ca4754',
  };
  const rootStyle = document.documentElement.style;
  const themesKey: keyof BrowserSessionStorage = 'themes';
  return async (tabId: number) => {
    const themesContainer = await browser.storage.session.get(themesKey);
    if (!Object.hasOwn(themesContainer, themesKey)) {
      return;
    }
    const themes: Array<[number, Theme]> = themesContainer.themes;
    const themeMapping: [number, Theme] | undefined = themes.find((theme) => theme[0] === tabId);
    const theme = themeMapping === undefined ? defaultTheme : themeMapping[1];
    rootStyle.setProperty('--main-color', theme.mainColor);
    rootStyle.setProperty('--bg-color', theme.bgColor);
    rootStyle.setProperty('--sub-color', theme.subColor);
    rootStyle.setProperty('--text-color', theme.textColor);
    rootStyle.setProperty('--error-color', theme.errorColor);
  }
})();

class ElementRetrievalError extends Error {
  constructor(elementName: string) {
    super();
    this.message = 'unable to get ' + elementName;
  }
}

async function init() {
  // TODO recompute progress bar and streaks upon load
  try {
    // TODO throw into separate function
    browser.tabs.onActivated.addListener((activeInfo) => {
      matchThemeWithTab(activeInfo.tabId).catch((error) => console.error(error));
    });
    const tabs = await browser.tabs.query({ url: 'https://monkeytype.com/*', active: true });
    const tab = tabs.at(0);
    if (tab !== undefined && tab.id !== undefined) {
      await matchThemeWithTab(tab.id);
    }
    // maybe create functions for this
    const usernameInput = document.getElementById('usernameInput');
    if (usernameInput === null || !(usernameInput instanceof HTMLInputElement)) {
      throw new ElementRetrievalError('usernameInput');
    }
    const apeKeyInput = document.getElementById('apeKeyInput');
    if (apeKeyInput === null || !(apeKeyInput instanceof HTMLInputElement)) {
      throw new ElementRetrievalError('apeKeyInput');
    }
    const saveAccountInfo = document.getElementById('saveAccountInfo');
    if (saveAccountInfo === null) {
      throw new ElementRetrievalError('saveAccountInfo');
    }
    const loadAccountInfo = document.getElementById('loadAccountInfo');
    if (loadAccountInfo === null) {
      throw new ElementRetrievalError('loadAccountInfo');
    }

    // TODO add 30 req per day limit (or don't)
    loadAccountInfo.addEventListener('click', async (pointerEvent) => {
      pointerEvent.preventDefault();
      // const apeKeysURL = 'https://monkeytype.com/account-settings?tab=apeKeys';
      // const tab = await browser.tabs.create({ url: apeKeysURL });
      // if (tab.id === undefined) {
      //   return;
      // }
      // // TODO change to go through bg script
      // const messageResponse = await browser.tabs.sendMessage(tab.id, 'hi');
      const username = usernameInput.value;
      const apeKey = 'ApeKey ' + apeKeyInput.value;
      // if ('only close when signed in and shit successful'.length > 0) {
      //   browser.tabs.discard(tab.id);
      // }
      const headers = new Headers({
        'Authorization': apeKey,
        'Content-Type': 'application/json'
      });
      const monkeytypeAPIEndpoint = 'https://api.monkeytype.com/results';
      // TODO handle response
      const requestResponse = await window.fetch(new Request(monkeytypeAPIEndpoint, {
        method: 'GET',
        headers
      }));
      // TODO timestamp is the ms since the epoch, i.e. a date (yipee)
    });

    const dayInputs = document.getElementsByClassName('dayInput');
    const daysInWeek = 7;
    if (dayInputs.length !== daysInWeek) {
      throw new ElementRetrievalError('dayInputs');
    }
    const saveGoalInput = document.getElementById('saveGoalInput');
    if (saveGoalInput === null) {
      throw new ElementRetrievalError('saveGoalInput');
    }
    const currentStreak = document.getElementById('currentStreak');
    if (currentStreak === null) {
      throw new ElementRetrievalError('currentStreak');
    }
    const bestStreak = document.getElementById('bestStreak');
    if (bestStreak === null) {
      throw new ElementRetrievalError('bestStreak');
    }
    const calculateStreaksHandler = createCalculateStreaksHandler(currentStreak, bestStreak);
    await calculateStreaksHandler();
    saveGoalInput.addEventListener('click', async (pointerEvent) => {
      pointerEvent.preventDefault();
      try {
        await calculateStreaksHandler();
      } catch (error) {
        console.error(error);
      }
    });

    // TODO message bg script and save the daily goals and recompute the streaks
    const exportDataButton = document.getElementById('exportData');
    if (exportDataButton === null) {
      throw new Error('unable to get exportDataButton');
    }
    exportDataButton.addEventListener('click', async () => {
      try {
        const browserStorage = await browser.storage.sync.get(null);
        const dataBlob = new window.Blob([JSON.stringify(browserStorage)], {
          type: "application/json"
        });
        const dataURL = window.URL.createObjectURL(dataBlob);
        await browser.downloads.download({ url: dataURL });
      } catch (error) {
        console.log('failed to export data,', error);
      }
    });

    const importDataZone = document.getElementById('importDataZone');
    if (importDataZone === null) {
      throw new ElementRetrievalError('importDataZone');
    }
    importDataZone.addEventListener('drop', (dragEvent) => {
      const dataTransfer = dragEvent.dataTransfer;
      if (dataTransfer === null) {
        return;
      }
      const files = dataTransfer.files;
      if (files.length !== 1) {
        console.error('please only drag and drop the extension data');
        return;
      }
      const file = files.item(0);
      if (file === null) {
        console.error('wtf');
        return;
      }
      const fileReader = new FileReader();
      fileReader.readAsText(file);
      fileReader.addEventListener('load', () => {
        const data = fileReader.result;
        if (typeof data !== "string") {
          return;
        }
        // TODO validate the data and save to browserStorage
        const dataObject = JSON.parse(data);
        console.log(JSON.stringify(dataObject));
      });
    });
  } catch (error) {
    console.error(error);
  }
}

init();
