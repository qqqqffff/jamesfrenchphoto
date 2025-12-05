import { PhotoSet } from "../../../types";

const setDataKey = Symbol('set');

export type PhotoSetData = { [setDataKey]: true; setId: PhotoSet['id'] };

export function getSetData(set: PhotoSet): PhotoSetData {
  return { [setDataKey]: true, setId: set.id };
}

export function isSetData(data: Record<string | symbol, unknown>): data is PhotoSetData {
  return data[setDataKey] === true;
}

//TODO: reference table component for canMonitor code
