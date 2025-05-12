import { Dispatch, SetStateAction } from "react"
import { Package, PackageItem, UserTag } from "../../../types"

interface BooleanItemProps { 
  item: PackageItem,
  selectedPackage: Package
  parentUpdatePackage: Dispatch<SetStateAction<Package | undefined>>
  parentUpdatePackageList: Dispatch<SetStateAction<Package[]>>
  selectedTag: UserTag
}

export const BooleanItem = (props: BooleanItemProps) => {
  return (
    <></>
  )
}