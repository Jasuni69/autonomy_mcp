import type { Logger } from '../prereqs';

export function createConsoleLogger(): Logger {
  return {
    appendLine(msg: string) {
      console.log(msg);
    },
  };
}
