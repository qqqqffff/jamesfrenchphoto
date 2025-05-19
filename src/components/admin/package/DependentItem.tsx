import { Dispatch, SetStateAction, useState } from "react"
import { Package, PackageItem } from "../../../types"
import { HiOutlineMinus, HiOutlinePlus, HiOutlineXMark } from "react-icons/hi2"
import { TextInput } from "flowbite-react"
import { textInputTheme } from "../../../utils"
import { PriceInput } from "../../common/PriceInput"

interface DependentItemProps {
  item: PackageItem
  selectedPackage: Package
  parentUpdatePackage: Dispatch<SetStateAction<Package | undefined>>
  parentUpdatePackageList: Dispatch<SetStateAction<Package[]>>
}
export const DependentItem = (props: DependentItemProps) => {
  const [search, setSearch] = useState<string>('')
  const [focused, setFocused] = useState(false)

  return (
    <div className="flex flex-row items-start gap-4">
      <div className="flex flex-col gap-2">
        <div className="relative">
          <TextInput 
            theme={textInputTheme}
            sizing="sm"
            placeholder="Select Dependent Item"
            className={`max-w-[400px] min-w-[250px] placeholder:italic`}
            value={props.item.dependent === '' ? search : props.item.dependent}
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => {
              setSearch('')
              setFocused(false)
            }, 200)}
            onChange={(event) => {
              setSearch(event.target.value)
            }}
          />
          {focused && (
            <div className="absolute z-10 mt-1 bg-white border border-gray-200 rounded-md shadow-lg flex flex-col min-w-[200px]">
              <div className="w-full whitespace-nowrap border-b py-1 px-2 text-base self-center flex flex-row justify-between">
                <span>Pick Priced Item</span>
                <button 
                  className=""
                  onClick={() => {
                    setFocused(false)
                  }}
                >
                  <HiOutlineXMark size={16} className="text-gray-400 hover:text-gray-800"/>
                </button>
              </div>
              <div className="max-h-60 overflow-y-auto py-1 min-w-max">
                {props.selectedPackage.items.map((item) => {
                  if(item.max === undefined || item.hardCap === undefined) {
                    return (<></>)
                  }
                  return (
                    <div className="flex flex-row justify-between items-center pe-2">
                      <button
                        className="flex flex-row w-full items-center gap-2 py-2 ps-2 me-2 hover:bg-gray-100 cursor-pointer disabled:hover:cursor-wait" 
                        onClick={() => {
                          const tempPackage: Package = {
                            ...props.selectedPackage,
                            items: props.selectedPackage.items.map((item) => (item.id === props.item.id) ? ({
                              ...props.item,
                              dependent: item.id
                            }) : item)
                          }

                          props.parentUpdatePackage(tempPackage)
                          props.parentUpdatePackageList((prev) => prev.map((pack) => pack.id === tempPackage.id ? tempPackage : pack))
                        }}
                      >
                        <span>{item.name}</span>
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
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
              onBlur={() => {
                if(props.item.quantities && props.item.quantities <= 0) {
                  const tempPackage: Package = {
                  ...props.selectedPackage,
                  items: props.selectedPackage.items.map((pItem) => (pItem.id === props.item.id ? ({
                    ...props.item,
                    quantities: 1
                  }) : pItem))
                }
      
                props.parentUpdatePackage(tempPackage)
                props.parentUpdatePackageList((prev) => prev.map((pack) => (
                  pack.id === tempPackage.id ? tempPackage : pack
                )))
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
                    quantities: isNaN(numValue) ? 0 : numValue
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
              onBlur={() => {
                if(props.item.quantities && props.item.quantities <= 0) {
                  const tempPackage: Package = {
                  ...props.selectedPackage,
                  items: props.selectedPackage.items.map((pItem) => (pItem.id === props.item.id ? ({
                    ...props.item,
                    quantities: 1
                  }) : pItem))
                }
      
                props.parentUpdatePackage(tempPackage)
                props.parentUpdatePackageList((prev) => prev.map((pack) => (
                  pack.id === tempPackage.id ? tempPackage : pack
                )))
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
                    quantities: isNaN(numValue) ? 0 : numValue
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
        <PriceInput 
          value={props.item.price ?? ''}
          updateState={(value) => {
            const tempPackage: Package = {
              ...props.selectedPackage,
              items: props.selectedPackage.items.map((item) => (item.id === props.item.id ? ({
                ...props.item,
                price: value,
              }) : item))
            }

            props.parentUpdatePackage(tempPackage)
            props.parentUpdatePackageList((prev) => prev.map((pack) => pack.id === tempPackage.id ? tempPackage : pack))
          }}
        />
      </div>
    </div>
  )
}