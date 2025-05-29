import { Button } from "flowbite-react"
import { Package, PhotoCollection } from "../../../types"
import { DefaultItem } from "./DefaultItem"
import { DependentItem } from "./DependentItem"
import { PricedItem } from "./PricedItem"
import { TieredItem } from "./TieredItem"
import { useState } from "react"
import { priceFormatter } from "../../../functions/packageFunctions"

interface PackageCardProps {
  package: Package
  collectionList: PhotoCollection[]
  actionButton?: JSX.Element,
  displayDependent?: boolean
}

export const PackageCard = (props: PackageCardProps) => {
  const [allExpanded, setAllExpanded] = useState(false)

  return (
    <div className="max-h-[75vh] overflow-y-auto border rounded-lg px-2 py-1 min-w-[500px] max-w-[500px] flex flex-col gap-2">
      <div className="flex flex-row items-center justify-center">
        <span className="font-bodoni text-xl">{props.package.name}</span>
      </div>
      <div className="border"/>
      {props.package.description && (
        <div className="border-b pb-2 flex flex-row justify-center mx-8">
          <span className="text-sm font-thin text-wrap">{props.package.description}</span>
        </div>
      )}
      <div className="flex flex-col gap-1.5">
        {props.package.items
        .sort((a, b) => a.order - b.order)
        .map((item, index) => {
          if(item.max !== undefined) {
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
          if(item.dependent !== undefined && props.displayDependent) {
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
      {props.package.price && props.package.price !== '0' && (
        <div className="border-t pt-2 flex flex-row justify-center text-xl mx-8 italic">Base Cost: {priceFormatter.format(parseFloat(props.package.price))}</div>
      )}
      <div className="w-full flex flex-row-reverse pb-3 pe-2 sticky gap-4">
        {props.actionButton}
        <Button size="sm" color="gray" onClick={() => setAllExpanded(!allExpanded)}>{allExpanded ? 'Hide All' : 'Show All'} Details</Button>
      </div>
    </div>
  )
}