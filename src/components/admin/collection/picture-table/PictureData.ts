import { PicturePath } from "../../../../types"

const pictureDataKey = Symbol('picture')

export type PictureData = { 
  [pictureDataKey]: true, 
  picture: PicturePath,
  rect: DOMRect
}

export function getPictureData({
  picture,
  rect
}: Omit<PictureData, typeof pictureDataKey>): PictureData {
  return { 
    [pictureDataKey]: true, 
    picture: picture, 
    rect: rect 
  }
}

export function isPictureData(data: Record<string | symbol, unknown>): data is PictureData {
  return data[pictureDataKey] === true
}

export function isDraggingAPicture({
  source
}: { 
  source: { data: Record<string | symbol, unknown> }
}): boolean { 
  return isPictureData(source.data)
}

const pictureDropTargetKey = Symbol('picture-drop-target')
export type PictureDropTargetData = {
  [pictureDropTargetKey]: true;
  picture: PicturePath,
}

export function isPictureDropTargetData(
  value: Record<string | symbol, unknown>
): value is PictureDropTargetData {
  return value[pictureDropTargetKey] === true
}

export function getPictureDropTargetData({
  picture,
}: Omit<PictureDropTargetData, typeof pictureDropTargetKey>): PictureDropTargetData {
  return {
    [pictureDropTargetKey]: true,
    picture: picture
  }
}