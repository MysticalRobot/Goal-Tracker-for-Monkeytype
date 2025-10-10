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
  | 'updateStreaks'
  | 'checkLoginStatus'
  | 'loadInfo';
};

declare type UpdateIconMessage = Message & {
  action: 'updateIcon';
  theme: Theme;
};

declare type TimeTyping = {
  date: Date;
  duration: number;
};

declare type SaveTypingTypingMessage = Message & {
  action: 'saveTimeTyping';
  timeTypingSeconds: TimeTyping;
};

declare type CalculateStreaksMessage = Message & {
  action: 'calculateStreaks';
};

declare type CheckLoginStatusMessage = Message & {
  action: 'checkLoginStatus';
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

declare type BrowserStorage = {
  themes: Map<number, Theme>;
  timeTypingHistoryMinutes: Array<TimeTyping>;
  // information needed by popup
  timeTypingTodaySeconds: TimeTyping;
  dailyGoalMinutes: {
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
