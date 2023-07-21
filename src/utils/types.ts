export const isErr = (val: unknown): val is Error => val instanceof Error;
export const isStr = (val: unknown): val is string => typeof val === 'string';
export const isNum = (val: unknown): val is number => typeof val === 'number';
export const isBool = (val: unknown): val is boolean => typeof val === 'boolean';
export const isNull = (val: unknown): val is null => val === null;
export const isUndef = (val: unknown): val is undefined => typeof val === 'undefined';
