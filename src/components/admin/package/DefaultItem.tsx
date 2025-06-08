import { Dispatch, SetStateAction } from "react"
import { Package, PackageItem } from "../../../types"
import { HiOutlineMinus, HiOutlinePlus } from 'react-icons/hi2'
import { Checkbox, TextInput } from "flowbite-react"
import { textInputTheme } from "../../../utils"

interface DefaultItemProps {
  item: PackageItem
  selectedPackage: Package,
  parentUpdatePackage: Dispatch<SetStateAction<Package | undefined>>
  parentUpdatePackageList: Dispatch<SetStateAction<Package[]>>
}

export const DefaultItem = (props: DefaultItemProps) => {
  if(!props.item.quantities) return (<></>)
    
  return (
    <div className="flex flex-row items-start gap-4">
      <div className="flex flex-col gap-2">
        <div className="flex flex-row items-center gap-2">
          <span className="text-lg font-light italic">Quantity:</span>
          <div className="flex flex-row items-center gap-2">
            <button
              className="p-1 border rounded-lg aspect-square flex justify-center items-center disabled:opacity-60 enabled:hover:bg-gray-100"
              disabled={props.item.quantities === 1}
              onClick={() => {
                const tempPackage: Package = {
                  ...props.selectedPackage,
                  items: props.selectedPackage.items.map((pItem) => (pItem.id === props.item.id ? ({
                    ...props.item,
                    quantities: (props.item.quantities ?? 1) - 1
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
              value={props.item.quantities}
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
                    quantities: isNaN(numValue) ? props.item.quantities === 0 ? Infinity : 0 : numValue
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
                    quantities: (props.item.quantities ?? 1) + 1
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
        <button
          className="flex flex-row items-center gap-2 disabled:opacity-65 disabled:hover:cursor-not-allowed"
          onClick={(event) => {
            event.stopPropagation()
            const tempPackage: Package = {
              ...props.selectedPackage,
              items: props.selectedPackage.items.map((item) => (item.id === props.item.id ? ({
                ...props.item,
                display: !props.item.display
              }) : item))
            }
      
            props.parentUpdatePackage(tempPackage)
            props.parentUpdatePackageList((prev) => prev.map((pack) => pack.id === tempPackage.id ? tempPackage : pack))
          }}
        >
          <Checkbox 
            className='disabled:hover:cursor-not-allowed enabled:hover:cursor-pointer' 
            onClick={() => {
              const tempPackage: Package = {
                ...props.selectedPackage,
                items: props.selectedPackage.items.map((item) => (item.id === props.item.id ? ({
                  ...props.item,
                  display: !props.item.display
                }) : item))
              }
        
              props.parentUpdatePackage(tempPackage)
              props.parentUpdatePackageList((prev) => prev.map((pack) => pack.id === tempPackage.id ? tempPackage : pack))
            }}
            checked={props.item.display ?? true}
            readOnly 
          />
          <span className="italic font-light">Display</span>
        </button>
      </div>
    </div>
  )
}