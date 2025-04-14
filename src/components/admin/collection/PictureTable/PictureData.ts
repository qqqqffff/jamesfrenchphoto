// import { PicturePath } from "../../../../types"

const pictureDataKey = Symbol('picture')

export type PictureData = { [pictureDataKey]: true, pictureId: string }

//TODO: replace me
export function getPictureData(item: string): PictureData {
  return { [pictureDataKey]: true, pictureId: item }
}

export function isPictureData(data: Record<string | symbol, unknown>): data is PictureData {
  return data[pictureDataKey] === true
}