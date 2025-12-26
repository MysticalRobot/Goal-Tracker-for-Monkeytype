export type Theme = {
  mainColor: string;
  bgColor: string;
  subColor: string;
  subAltColor: string;
  textColor: string;
  errorColor: string;
};

export type MessageResponse = {
  success: boolean;
  message: any;
};

export type BackgroundScriptMessage = {
  action: 'updateTheme' | 'saveTimeTyping';
};

export type UpdateThemeMessage = BackgroundScriptMessage & {
  action: 'updateTheme';
  theme: Theme;
};

export type SaveTimeTypingMessage = BackgroundScriptMessage & {
  action: 'saveTimeTyping';
  timeTypingMinutes: number;
};

export type BrowserSessionStorage = {
  themes: Array<[number, Theme]>;
};

export const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
export type DailyGoalsMinutes = {
  [Property in typeof dayNames[number]]: number;
};

export type TimeTyping = {
  date: Date;
  minutes: number;
}

export const notificationFrequencies = ['never', 'quarterGoalCompletion', 'halfGoalCompletion', 'goalCompletion'] as const;
export type NotificationFrequency = typeof notificationFrequencies[number];
export type BrowserSyncStorage = {
  // information needed by popup
  timeTypingToday: TimeTyping;
  dailyGoalsMinutes: DailyGoalsMinutes;
  notificationFrequency: NotificationFrequency;
};
