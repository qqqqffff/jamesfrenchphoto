import { Button } from "flowbite-react"
import { Package, PhotoCollection } from "../../../types"
import { DefaultItem } from "./DefaultItem"
import { DependentItem } from "./DependentItem"
import { PricedItem } from "./PricedItem"
import { TieredItem } from "./TieredItem"
import { useState } from "react"

interface PackageCardProps {
  package: Package
  collectionList: PhotoCollection[]
}

export const PackageCard = (props: PackageCardProps) => {
  const [allExpanded, setAllExpanded] = useState(false)

  return (
    <div className="max-h-[80vh] overflow-y-auto border rounded-lg px-2 py-1 min-w-[500px] max-w-[500px] flex flex-col gap-2">
      <div className="flex flex-row items-center justify-center">
        <span className="font-bodoni text-xl">{props.package.name}</span>
      </div>
      <div className="border"/>
      <div className="flex flex-col gap-1.5">
        {props.package.items.map((item, index) => {
          if(item.max !== undefined && item.hardCap !== undefined) {
            return (
              <PricedItem 
                key={index}
                display='list'
                item={item}
                collectionList={props.collectionList}
                expand={allExpanded}
              />
            )
          }
          if(item.quantities !== undefined && item.dependent === undefined) {
            return (
              <DefaultItem
                key={index}
                display='list'
                item={item}
                expand={allExpanded}
              />
            )
          }
          if(item.statements !== undefined) {
            return (
              <TieredItem 
                key={index}
                display="list"
                item={item}
                expand={allExpanded}
              />
            )
          }
          if(item.dependent !== undefined) {
            return (
              <DependentItem 
                key={index}
                item={item}
                display="list"
                packageItems={props.package.items}
                expand={allExpanded}
              />
            )
          }
        })}
      </div>
      <div className="w-full flex flex-row-reverse pb-3 pe-2 sticky">
        <Button size="sm" color="gray" onClick={() => setAllExpanded(!allExpanded)}>{allExpanded ? 'Hide All' : 'Show All'} Details</Button>
      </div>
    </div>
  )
}