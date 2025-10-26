import { UseQueryResult } from "@tanstack/react-query"
import { PicturePath } from "../../types"

interface PictureItemProps {
  picture: PicturePath
  watermarkPath?: string
  watermarkQuery: UseQueryResult<[string | undefined, string] | undefined, Error> | undefined
}

export const PictureItem = (props: PictureItemProps) => {

}