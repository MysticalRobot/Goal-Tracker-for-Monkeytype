async function init() {
  // TODO recompute progress bar and streaks upon load
  const themesKey: keyof BrowserStorage = 'themes';
  try {
    const themesContainer = await browser.storage.local.get(themesKey);
    if (Object.hasOwn(themesContainer, themesKey)) {
      const themes: Theme = themesContainer.themes;
      const rootStyle = window.getComputedStyle(document.documentElement);
      rootStyle.setProperty('--main-color', themes.mainColor);
      rootStyle.setProperty('--bg-color', themes.bgColor);
      rootStyle.setProperty('--sub-color', themes.subColor);
      rootStyle.setProperty('--text-color', themes.textColor);
      rootStyle.setProperty('--error-color', themes.errorColor);
    }

    // maybe create functions for this
    const usernameInput = document.getElementById('usernameInput');
    if (usernameInput === null || !(usernameInput instanceof HTMLInputElement)) {
      throw new Error('unable to get usernameInput');
    }
    const apeKeyInput = document.getElementById('apeKeyInput');
    if (apeKeyInput === null || !(apeKeyInput instanceof HTMLInputElement)) {
      throw new Error('unable to get apeKeyInput');
    }
    const saveAccountInfo = document.getElementById('saveAccountInfo');
    if (saveAccountInfo === null) {
      throw new Error('unable to get saveAccountInfo');
    }
    const loadAccountInfo = document.getElementById('loadAccountInfo');
    if (loadAccountInfo === null) {
      throw new Error('unable to get loadAccountInfo');
    }

    // TODO add 30 req per day limit (or don't)
    loadAccountInfo.addEventListener('click', async (pointerEvent) => {
      pointerEvent.preventDefault();
      const apeKeysURL = 'https://monkeytype.com/account-settings?tab=apeKeys';
      const tab = await browser.tabs.create({ url: apeKeysURL });
      if (tab.id === undefined) {
        return;
      }
      // TODO change to go through bg script
      const messageResponse = await browser.tabs.sendMessage(tab.id, 'hi');
      const username = usernameInput.value;
      const apeKey = apeKeyInput.value;
      if ('only close when signed in and shit successful'.length > 0) {
        browser.tabs.discard(tab.id);
      }
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
    });

    const dayInputs = document.getElementsByClassName('dayInput');
    const daysInWeek = 7;
    if (dayInputs.length !== daysInWeek) {
      throw new Error('unable to get all the dayInputs');
    }
    const saveGoalInput = document.getElementById('saveGoalInput');
    if (saveGoalInput === null) {
      throw new Error('unable to get saveGoalInput');
    }
    saveGoalInput.addEventListener('click', (pointerEvent) => {
      pointerEvent.preventDefault();
    });
    // TODO message bg script and save the daily goals and recompute the streaks

    const exportDataButton = document.getElementById('exportData');
    if (exportDataButton === null) {
      throw new Error('unable to get exportDataButton');
    }
    exportDataButton.addEventListener('click', async () => {
      try {
        const browserStorage = await browser.storage.local.get(null);
        const themesKey: keyof BrowserStorage = 'themes';
        const dataToSave = window.Object.entries(browserStorage).filter(([key, _]) => key !== themesKey);
        const dataBlob = new window.Blob([JSON.stringify(dataToSave)], {
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
      throw new Error('unable to get importDataZone');
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
