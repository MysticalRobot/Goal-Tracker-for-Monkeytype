import { getIntervalManager } from '../utils';
import type { SaveTimeTypingMessage, MessageResponse } from '../types';

function createTimingCallbacks(): [() => void, () => void] {
  let timeTypingMs: number = 0;
  let prevTimeMs: number | undefined = undefined;
  const oneSecondInMs = 1000;
  const oneMinuteinMs = 60000;
  const recordTimeTyping = () => {
    if (prevTimeMs === undefined) {
      prevTimeMs = Date.now();
      return;
    }
    const currentTimeMs = Date.now();
    const elapsedTimeMs = currentTimeMs - prevTimeMs;
    if (elapsedTimeMs <= oneSecondInMs) {
      timeTypingMs += elapsedTimeMs
    }
    prevTimeMs = currentTimeMs;
  };
  const saveTimeTyping = async () => {
    if (timeTypingMs === 0) {
      return;
    }
    const errorMinutes = 0.001255;
    const timeTypingMinutes = timeTypingMs / oneMinuteinMs + errorMinutes;
    const message: SaveTimeTypingMessage = {
      action: 'saveTimeTyping',
      timeTypingMinutes
    };
    const response: MessageResponse = await browser.runtime.sendMessage(message);
    if (!response.success) {
      console.error(response.message);
    }
    timeTypingMs = 0;
  };
  return [recordTimeTyping, saveTimeTyping]
}

const wordsInput = document.getElementById('wordsInput');
const [recordTimeTyping, saveTimeTyping] = createTimingCallbacks();
if (wordsInput !== null) {
  wordsInput.addEventListener('keypress', recordTimeTyping);
  wordsInput.addEventListener('focusout', saveTimeTyping);
  // periodically save the time spent timing when the tab is active
  const periodMs = 1000;
  const intervalManager = getIntervalManager(saveTimeTyping, periodMs);
  document.addEventListener('visibilitychange', intervalManager);
  intervalManager();
}
