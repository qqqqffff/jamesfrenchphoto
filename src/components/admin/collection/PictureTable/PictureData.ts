import { PicturePath } from "../../../../types"

const pictureDataKey = Symbol('picture')

export type PictureData = { [pictureDataKey]: true, pictureId: PicturePath['id'] }

export function getPictureData(item: PicturePath): PictureData {
  return { [pictureDataKey]: true, pictureId: item.id }
}

export function isPictureData(data: Record<string | symbol, unknown>): data is PictureData {
  return data[pictureDataKey] === true
}