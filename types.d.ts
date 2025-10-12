// all time in stores in minutes

declare type Theme = {
  mainColor: string;
  bgColor: string;
  subColor: string;
  textColor: string;
  errorColor: string;
};

declare type MessageResponse = {
  success: boolean;
  message: string;
};

declare type Message = {
  action:
  | 'updateIcon'
  | 'saveTimeTyping'
  | 'loadInfo';
};

declare type UpdateIconMessage = Message & {
  action: 'updateIcon';
  theme: Theme;
};

declare type TimeTyping = {
  date: Date;
  minutes: number;
};

declare type SaveTimeTypingMessage = Message & {
  action: 'saveTimeTyping';
  timeTyping: TimeTyping;
};

declare type LoadInfoMessage = Message & {
  action: 'loadInfo';
};

declare type MonkeyTypeStatsRequest = {
  username: string;
  apeKey: string;
};

declare type MonkeyTypeStatsResponse = {
  message: string;
  data: Array<{
    timestamp: 0;
    testDuration: 1;
    afkDuration: 0;
    incompleteTestSeconds: 0;
    uid: "^a$";
    _id: "^a$";
    restartCount: 0;
  }>;
};

declare type BrowserSessionStorage = {
  themes: Array<[number, Theme]>;
}

declare type BrowserSyncStorage = {
  timeTypingHistory: Array<TimeTyping>;
  // information needed by popup
  timeTypingToday: TimeTyping;
  dailyGoal: {
    sunday: number;
    monday: number;
    tuesday: number;
    wednesday: number;
    thursday: number;
    friday: number;
    saturday: number;
  };
  username: string;
  apeKey: string;
  notificationFrequency:
  | 'never'
  | 'quarterGoalCompletion'
  | 'halfGoalCompletion'
  | 'goalCompletion';
};
