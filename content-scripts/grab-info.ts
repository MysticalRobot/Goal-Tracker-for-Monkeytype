const accountButton = document.getElementsByClassName('accountButtonAndMenu').item(0) as HTMLDivElement | null;
const generateNewApeKey = document.getElementById('generateNewApeKey');

browser.runtime.onMessage.addListener((message) => {
  if (accountButton === null) {
    console.log('could not get accountButton');
    return;
  }
  generateNewApeKey.click();
  // TODO get all necessary elements
  console.log(generateNewApeKey);
  // const generateNewApeKeyNameInput = document.getElementById('generateNewApeKey_0');
  // const generateNewApeKeySubmitButton = document.getElementById('generateNewApeKey_0');

  const generateNewApeKeyNameInput = document.getElementById('generateNewApeKey_0');
  const generateNewApeKeySubmitButton = document.getElementById('generateNewApeKey_0');
  // TODO activate key
  const viewApeKey = document.getElementById('viewApeKey_0');
  accountButton.click()
  console.log(accountButton);
  console.log('hi');
})
