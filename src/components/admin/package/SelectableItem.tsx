import { Dispatch, SetStateAction } from "react"
import { Package, PackageItem, PhotoCollection } from "../../../types"
import { HiOutlineMinus, HiOutlinePlus } from 'react-icons/hi'
import { TextInput } from "flowbite-react"
import { textInputTheme } from "../../../utils"
import { PercentInput } from "../../common/PercentInput"
import { PriceInput } from "../../common/PriceInput"
import { CollectionPicker } from "./CollectionPicker"
import { UseQueryResult } from "@tanstack/react-query"

interface SelectableItemProps {
  item: PackageItem
  selectedPackage: Package
  collectionListQuery: UseQueryResult<PhotoCollection[] | undefined, Error>
  parentUpdatePackage: Dispatch<SetStateAction<Package | undefined>>
  parentUpdatePackageList: Dispatch<SetStateAction<Package[]>>
}

export const SelectableItem = (props: SelectableItemProps) => {
  if(props.item.max === undefined || props.item.hardCap === undefined) return (<></>)

  return (
    <div className="flex flex-row items-start gap-4">
      <div className="flex flex-col gap-2">
        <div className="flex flex-row items-center gap-2">
          <span className="text-lg font-light italic">Items:</span>
          <div className="flex flex-row items-center gap-2">
            <button
              className="p-1 border rounded-lg aspect-square flex justify-center items-center disabled:opacity-60 enabled:hover:bg-gray-100"
              disabled={props.item.max === 0}
              onClick={() => {
                const tempPackage: Package = {
                  ...props.selectedPackage,
                  items: props.selectedPackage.items.map((pItem) => (pItem.id === props.item.id ? ({
                    ...props.item,
                    max: (props.item.max ?? 1) - 1
                  }) : pItem))
                }
      
                props.parentUpdatePackage(tempPackage)
                props.parentUpdatePackageList((prev) => prev.map((pack) => (
                  pack.id === tempPackage.id ? tempPackage : pack
                )))
              }}
            >
              <HiOutlineMinus size={20} />
            </button>
            <TextInput 
              theme={textInputTheme}
              sizing="sm"
              className="min-w-[42px] max-w-[42px]" 
              placeholder="0"
              value={props.item.max}
              onChange={(event) => {
                const input = event.target.value.charAt(0) === '0' ? event.target.value.slice(1) : event.target.value

                if(!/^\d*$/g.test(input)) {
                  return
                }

                const numValue = parseInt(input)
                
                if(numValue <= -1) {
                  return
                }

                const tempPackage: Package = {
                  ...props.selectedPackage,
                  items: props.selectedPackage.items.map((pItem) => (pItem.id === props.item.id ? ({
                    ...props.item,
                    max: isNaN(numValue) ? 0 : numValue,
                    hardCap: numValue > (props.item.hardCap ?? 1) ? numValue : props.item.hardCap
                  }) : pItem))
                }
      
                props.parentUpdatePackage(tempPackage)
                props.parentUpdatePackageList((prev) => prev.map((pack) => (
                  pack.id === tempPackage.id ? tempPackage : pack
                )))
              }}
            />
            <button
              className="p-1 border rounded-lg aspect-square flex justify-center items-center hover:bg-gray-100"
              onClick={() => {
                const tempPackage: Package = {
                  ...props.selectedPackage,
                  items: props.selectedPackage.items.map((pItem) => (pItem.id === props.item.id ? ({
                    ...props.item,
                    max: (props.item.max ?? 1) + 1,
                    hardCap: ((props.item.max ?? 1) + 1) > (props.item.hardCap ?? 1) ? ((props.item.max ?? 1) + 1) : props.item.hardCap
                  }) : pItem))
                }
      
                props.parentUpdatePackage(tempPackage)
                props.parentUpdatePackageList((prev) => prev.map((pack) => (
                  pack.id === tempPackage.id ? tempPackage : pack
                )))
              }}
            >
              <HiOutlinePlus size={20} />
            </button>
          </div>
        </div>
        <div className="flex flex-row items-center gap-2">
          <span className="text-lg font-light italic pe-2">Max:</span>
          <div className="flex flex-row items-center gap-2">
            <button
              className="p-1 border rounded-lg aspect-square flex justify-center items-center disabled:opacity-60 enabled:hover:bg-gray-100"
              disabled={props.item.max >= props.item.hardCap && props.item.hardCap !== 0}
              onClick={() => {
                const tempPackage: Package = {
                  ...props.selectedPackage,
                  items: props.selectedPackage.items.map((pItem) => (pItem.id === props.item.id ? ({
                    ...props.item,
                    hardCap: props.item.hardCap === 0 ? Infinity : props.item.hardCap === Infinity ? 1 : (props.item.hardCap ?? 1) - 1
                  }) : pItem))
                }
      
                props.parentUpdatePackage(tempPackage)
                props.parentUpdatePackageList((prev) => prev.map((pack) => (
                  pack.id === tempPackage.id ? tempPackage : pack
                )))
              }}
            >
              <HiOutlineMinus size={20} />
            </button>
            <TextInput 
              theme={textInputTheme}
              sizing="sm"
              className="min-w-[42px] max-w-[42px]" 
              value={props.item.hardCap === Infinity ? '∞' : props.item.hardCap}
              onBlur={() => {
                if(props.item.max !== undefined && props.item.hardCap !== undefined){
                  if(props.item.max > props.item.hardCap) {
                    const tempPackage: Package = {
                      ...props.selectedPackage,
                      items: props.selectedPackage.items.map((pItem) => (pItem.id === props.item.id ? ({
                        ...props.item,
                        max: props.item.max,
                        hardCap:  props.item.max
                      }) : pItem))
                    }
          
                    props.parentUpdatePackage(tempPackage)
                    props.parentUpdatePackageList((prev) => prev.map((pack) => (
                      pack.id === tempPackage.id ? tempPackage : pack
                    )))
                  }
                }
              }}
              onChange={(event) => {
                const input = event.target.value.charAt(0) === '0' ? event.target.value.slice(1) : event.target.value

                if(!/^\d*$/g.test(input)) {
                  return
                }

                const numValue = parseInt(input)
                
                if(numValue < 0) {
                  return
                }

                const tempPackage: Package = {
                  ...props.selectedPackage,
                  items: props.selectedPackage.items.map((pItem) => (pItem.id === props.item.id ? ({
                    ...props.item,
                    hardCap: isNaN(numValue) ? props.item.hardCap === 0 ? Infinity : 0 : numValue
                  }) : pItem))
                }
      
                props.parentUpdatePackage(tempPackage)
                props.parentUpdatePackageList((prev) => prev.map((pack) => (
                  pack.id === tempPackage.id ? tempPackage : pack
                )))
              }}
            />
            <button
              className="p-1 border rounded-lg aspect-square flex justify-center items-center hover:bg-gray-100"
              onClick={() => {
                const tempPackage: Package = {
                  ...props.selectedPackage,
                  items: props.selectedPackage.items.map((pItem) => (pItem.id === props.item.id ? ({
                    ...props.item,
                    hardCap: props.item.hardCap === Infinity ? 1 : (props.item.hardCap ?? 1) + 1
                  }) : pItem))
                }
      
                props.parentUpdatePackage(tempPackage)
                props.parentUpdatePackageList((prev) => prev.map((pack) => (
                  pack.id === tempPackage.id ? tempPackage : pack
                )))
              }}
            >
              <HiOutlinePlus size={20} />
            </button>
          </div>
        </div>
        <PriceInput 
          value={props.item.price ?? ''}
          discount={props.item.discount}
          displayDiscount={true}
          updateState={(value) => {
            const tempPackage: Package = {
              ...props.selectedPackage,
              items: props.selectedPackage.items.map((item) => (item.id === props.item.id ? ({
                ...props.item,
                price: value
              }) : item))
            }
      
            props.parentUpdatePackage(tempPackage)
            props.parentUpdatePackageList((prev) => prev.map((pack) => pack.id === tempPackage.id ? tempPackage : pack))
          }}
        />
        <div className="flex flex-row gap-2">
          <PercentInput 
            item={props.item}
            selectedPackage={props.selectedPackage}
            parentUpdatePackage={props.parentUpdatePackage}
            parentUpdatePackageList={props.parentUpdatePackageList}
          />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <CollectionPicker 
          collectionList={props.collectionListQuery.data ?? []}
          parentSelectCollection={(collectionId, selected) => {
            const tempPackage: Package = {
              ...props.selectedPackage,
              items: props.selectedPackage.items.map((pItem) => (pItem.id === props.item.id ? ({
                ...props.item,
                collectionIds: selected ? (
                  [...props.item.collectionIds, collectionId] 
                ) : ( 
                  props.item.collectionIds.filter((id) => id !== collectionId)
                )
              }) : pItem))
            }
  
            props.parentUpdatePackage(tempPackage)
            props.parentUpdatePackageList((prev) => prev.map((pack) => (
              pack.id === tempPackage.id ? tempPackage : pack
            )))
          }}
          parentUnselectAllCollections={() => {
            const tempPackage: Package = {
              ...props.selectedPackage,
              items: props.selectedPackage.items.map((pItem) => (pItem.id === props.item.id ? ({
                ...props.item,
                collectionIds: []
              }) : pItem))
            }

            props.parentUpdatePackage(tempPackage)
            props.parentUpdatePackageList((prev) => prev.map((pack) => (
              pack.id === tempPackage.id ? tempPackage : pack
            )))
          }}
          selectedCollections={props.collectionListQuery.data
            ?.filter((collection) => props.item.collectionIds.some((id) => id === collection.id)) ?? []
          }
        />
      </div>
    </div>
  )
}