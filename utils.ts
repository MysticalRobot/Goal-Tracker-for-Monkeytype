export function getIntervalManager(callback: () => void,
  timeout: number, intervalType: string) {
  let interval: number | undefined = undefined
  return () => {
    if (document.hidden) {
      console.debug(`clearing ${intervalType} interval`);
      clearInterval(interval);

    } else {
      console.debug(`setting ${intervalType} interval`);
      interval = setInterval(callback, timeout);
    }
  };
}

// schema that can be used with validate to verify an obs validity
export const schemaContainer: SchemaContainer = (() => {
  const theme = Object.freeze({ mainColor: '6=len,hex?', bgColor: '6=len,hex?' });
  const updateIconRequest = theme;
  const updateIconResponse = Object.freeze({ success: false, message: 'any?' });
  const themeRequest = Object.freeze({ action: 'eq?sendTheme' });
  const themeResponse = theme;
  const browserStorage = Object.freeze({ iconDataURI: 'any=len,base64?', theme });
  return {
    theme, updateIconRequest, updateIconResponse,
    themeRequest, themeResponse, browserStorage
  };
})();

// recursively validates properties and property types
export function validate(item: any, schema: Schema): ValidationError {
  if (!(item instanceof Object)) {
    return `validation error: ${item} is not an object`;
  }
  const strItem = JSON.stringify(item);
  const strSchema = JSON.stringify(schema);
  for (const [prop, value] of Object.entries(schema)) {
    if (!Object.hasOwn(item, prop)) {
      return `validation error: ${strItem} does not have property: ${prop}`;
    }
    const itemValue = item[prop];
    if (typeof itemValue !== typeof value) {
      console.debug(itemValue, JSON.stringify(item));
      return `validation error: ${strItem}'s property ${prop} does not have type: ${typeof value}`;
    } else if (itemValue instanceof Object) {
      // TODO (not really on my end) need to make sure all nested objects have schema
      const result = validate(itemValue, value as Schema);
      if (result !== undefined) {
        return result;
      }
      continue;
    } else if (typeof value !== 'string') {
      continue;
    }
    const delimiter: StringValidationRuleDelimiter = '?';
    const rulesEnd = value.indexOf(delimiter);
    if (rulesEnd === -1) {
      return `validation error: ${strSchema}'s property ${prop} does not have string validation rules`;
    }
    const rules = value.substring(0, rulesEnd).split(',') as Array<StringRule>;
    const trueValue = value.substring(rulesEnd + 1);
    for (const rule of rules) {
      switch (rule) {
        case 'hex':
          if (itemValue.match(/[^a-f0-9]/g) !== null) {
            return `validation error: ${strItem}'s property ${prop} is not a hexadecimal string`;
          }
          break;
        case 'base64':
          if (itemValue.match(/[^a-zA-Z0-9\+\/\=]/g) !== null) {
            return `validation error: ${strItem}'s property ${prop} is not a base64 encoded string`;
          }
          break;
        case 'eq':
          if (itemValue !== trueValue) {
            return `validation error: ${strItem}'s property ${prop} is not a base64 encoded string`;
          }
          break;
        case 'any=len':
          break;
        case 'any':
          break;
        default:
          const lengthEnd = rule.indexOf('=');
          if (lengthEnd === -1) {
            console.debug(rule);
            return `validation error: ${strSchema}'s property ${prop} is an invalid string validation rule`;
          }
          const length = Number(rule.substring(0, lengthEnd));
          if (itemValue.length !== length) {
            return `validation error: ${strItem}'s property ${prop} is not ${length} characters long`;
          }
      }
    }
  }
  return undefined;
}

