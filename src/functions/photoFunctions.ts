import { PicturePath } from "../types"

export const calculatePictureHeight = (path: PicturePath, dimensions: { width: number, height: number }, availableHeight: number) => {
    const ratio = (
      //portrait vs landscape display ratio
      dimensions.width > dimensions.height ? (
        //ratio - changes for different picture orientations
        path.width > path.height ? (path.width / path.height) : (path.height / path.width)
      ) : (
        path.width > path.height ?  (path.height / path.width) : (path.width / path.height)
      )
    )
    return (
      //ratio * available height = max picture height
      ratio * availableHeight
      // (dimensions.height - (carouselHidden ? 50 : 200))
    )
  }