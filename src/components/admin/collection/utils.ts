import { PicturePath } from "../../../types"
import { parsePathName } from "../../../utils"

export const detectDuplicates = (picturePaths: PicturePath[]) => {
  const temp: string[] = []
  const duplicates: PicturePath[] = []
  picturePaths.forEach((path) => {
      if(temp.includes(parsePathName(path.path))){
          duplicates.push(path)
      }
      else{
          temp.push(parsePathName(path.path))
      }
  })
  return duplicates
}