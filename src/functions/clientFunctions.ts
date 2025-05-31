import { PhotoCollection, UserTag } from "../types";

export const getUserCollectionList = (collections?: PhotoCollection[], tags?: UserTag[]) => {
  return [
    ...(collections ?? []),
    ...(tags?.flatMap((tag) => tag.collections ?? []) ?? [])
  ].reduce((prev, cur) => {
    if(!prev.some((col) => col.id === cur.id)) {
      prev.push(cur)
    }
    return prev
  }, [] as PhotoCollection[])
}