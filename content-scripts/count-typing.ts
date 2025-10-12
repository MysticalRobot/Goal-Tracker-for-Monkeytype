import { getIntervalManager } from "../utils";

function createTimingCallbacks(): [() => void, () => void] {
  let timeTypingSeconds: number = 0;
  let lastTime: number | undefined = undefined;
  const recordTimeTyping = () => {
    if (lastTime === undefined) {
      lastTime = Date.now();
    }
    const currentTime = Date.now();
    const oneSecondInMS = 1000;
    const elapsedTimeSeconds = (currentTime - lastTime) / oneSecondInMS;
    if (elapsedTimeSeconds > 1) {
      console.debug(`ignoring afk period of ${elapsedTimeSeconds} seconds`);
    } else {
      timeTypingSeconds += elapsedTimeSeconds
    }
    lastTime = currentTime;
  };
  const saveTimeTyping = async () => {
    if (timeTypingSeconds === 0) {
      return;
    }
    // TODO maybe try to overestimate a little so that if people do 1 60s test,
    // they actually hit their goal of 1 min
    const timeTypingMinutes = timeTypingSeconds / 60;
    const message: SaveTimeTypingMessage = {
      action: 'saveTimeTyping',
      timeTyping: {
        date: new Date(),
        minutes: timeTypingMinutes
      }
    };
    console.debug(`sending SaveTimeTypingMessage to save ${timeTypingMinutes} minutes`);
    const response: MessageResponse = await browser.runtime.sendMessage(message);
    if (response.success) {
      console.debug(response.message);
    } else {
      console.error(response.message);
    }
    timeTypingSeconds = 0;
  };
  return [recordTimeTyping, saveTimeTyping]
}

const wordsInput = document.getElementById('wordsInput');
const [recordTimeTyping, saveTimeTyping] = createTimingCallbacks();
if (wordsInput !== null) {
  wordsInput.addEventListener('keypress', recordTimeTyping);
  wordsInput.addEventListener('focusout', saveTimeTyping);
  // periodically save the time spent timing when the tab is active
  const tenSecondsInMS = 10000;
  const intervalManager
    = getIntervalManager(saveTimeTyping, tenSecondsInMS, 'saveTimeTyping');
  document.addEventListener('visibilitychange', intervalManager);
  intervalManager();
}
