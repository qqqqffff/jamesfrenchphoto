import { Button, Dropdown, Radio, TextInput, Tooltip } from "flowbite-react"
import { HiBars3, HiOutlineExclamationCircle, HiOutlineInformationCircle, HiOutlineMinus, HiOutlinePlus, HiOutlinePlusCircle, HiOutlineXMark } from 'react-icons/hi2'
import { Package, PackageItem, PhotoCollection } from "../../../types"
import { Dispatch, SetStateAction, useCallback, useEffect, useRef, useState } from "react"
import { v4 } from 'uuid'
import { textInputTheme } from "../../../utils"
import { AutoExpandTextarea } from "../../common/AutoExpandTextArea"
import { HiOutlineDownload } from "react-icons/hi"
import { PackageItemLoader } from "../../modals/PackageItemLoader"
import { InfiniteData, UseInfiniteQueryResult, UseQueryResult } from "@tanstack/react-query"
import { GetInfinitePackageItemsData } from "../../../services/packageService"
import { PricedItem } from "./PricedItem"
import { TieredItem } from "./TieredItem"
import { DependentItem } from "./DependentItem"

interface ItemsPanelProps {
  selectedPackage: Package,
  parentUpdatePackage: Dispatch<SetStateAction<Package | undefined>>
  parentUpdatePackageList: Dispatch<SetStateAction<Package[]>>,
  allPackageItems: PackageItem[],
  allPackageItemsQuery: UseInfiniteQueryResult<InfiniteData<GetInfinitePackageItemsData, unknown>, Error>
  collectionListQuery: UseQueryResult<PhotoCollection[] | undefined, Error>
}

export const ItemsPanel = (props: ItemsPanelProps) => {
  const itemRefs = useRef<Map<string, HTMLDivElement | null>>(new Map())
  const addedItemFlag = useRef<string | null>(null)
  const [packageItemLoaderVisible, setPackageItemLoaderVisible] = useState(false)

  const setItemRef = useCallback((el: HTMLDivElement | null, id: string) => {
    if(el) {
      itemRefs.current.set(id, el)
    }
  }, [])

  useEffect(() => {
    if(addedItemFlag.current) {
      itemRefs.current.get(addedItemFlag.current)
        ?.scrollIntoView({ block: 'start', behavior: 'smooth' })

      addedItemFlag.current = null
    }
  }, [addedItemFlag.current])

  return (
    <>
      <PackageItemLoader 
        allPackageItems={props.allPackageItems}
        allPackageItemsQuery={props.allPackageItemsQuery}
        open={packageItemLoaderVisible}
        onClose={() => setPackageItemLoaderVisible(false)}
        updatePackageItems={(items) => {
          const tempItems: PackageItem[] = [...props.selectedPackage.items]

          for(let i = 0; i < items.length; i++){
            for(let j = 0; j < items[i].quantity; j++){
              //new id, createdAt timestamp, order, and packageId required
              tempItems.push({
                ...items[i].item,
                id: v4(),
                createdAt: new Date().toISOString(),
                order: tempItems.length,
                packageId: props.selectedPackage.id
              })
            }
          }

          const tempPackage: Package = {
            ...props.selectedPackage,
            items: tempItems
          }

          props.parentUpdatePackage(tempPackage)
          props.parentUpdatePackageList((prev) => prev.map((pack) => pack.id === tempPackage.id ? tempPackage : pack))
        }}
      />
      <div className="flex flex-col gap-2 w-full px-10 max-h-min">
        <div className="flex flex-row w-full justify-end gap-4 mb-2">
          <Button color="gray" onClick={() => setPackageItemLoaderVisible(true)}>
            <HiOutlineDownload size={20} className="me-1"/>
            <span>Load Item</span>
          </Button>
          <Button color="gray" onClick={() => {
            const itemId = v4();
            const tempPackage: Package = {
              ...props.selectedPackage,
              items: [...props.selectedPackage.items, {
                id: itemId,
                name: '',
                packageId: props.selectedPackage.id,
                order: props.selectedPackage.items.length,
                collectionIds: [],
                createdAt: new Date().toISOString()
              }]
            }

            addedItemFlag.current = itemId
            props.parentUpdatePackage(tempPackage)
            props.parentUpdatePackageList((prev) => prev.map((pack) => (
              pack.id === tempPackage.id ? tempPackage : pack
            )))
          }}>
            <HiOutlinePlusCircle size={20} className="me-1"/>
            <span>Create Item</span>
          </Button>
        </div>
        <div className="border rounded-lg flex flex-col w-full py-2 px-4 overflow-y-auto max-h-[68vh]">
        {props.selectedPackage.items.length > 0 ? (
          <div className="grid grid-cols-2 place-items-center gap-x-8 gap-y-4 w-full">
            {props.selectedPackage.items
              .sort((a, b) => a.order - b.order)
              .map((item, index) => {
                return (
                  <div 
                    className="flex flex-col rounded-lg border px-4 py-4 w-full gap-2 h-full" 
                    key={index}
                    ref={el => setItemRef(el, item.id)}
                  >
                    <div className="flex flex-row items-center justify-between gap-4">
                      <div className="flex flex-row items-center gap-4">
                        <HiBars3 size={24}/>
                        <div className="min-w-[170px]">
                        <TextInput 
                          theme={textInputTheme}
                          placeholder="Enter Item Name"
                          className="w-auto"
                          sizing='md'
                          onChange={(event) => {
                            const tempPackage: Package = {
                              ...props.selectedPackage,
                              items: props.selectedPackage.items.map((pItem) => (pItem.id === item.id ? ({
                                ...item,
                                name: event.target.value
                              }) : pItem))
                            }
                  
                            props.parentUpdatePackage(tempPackage)
                            props.parentUpdatePackageList((prev) => prev.map((pack) => (
                              pack.id === tempPackage.id ? tempPackage : pack
                            )))
                          }}
                          value={item.name}
                        />
                        </div>
                      </div>
                      <div className="flex flex-row items-center gap-4">
                      {/* TODO: destroy states when switching item type */}
                        {(item.max !== undefined || item.quantities !== undefined || item.statements !== undefined) ? (
                          <Tooltip
                            style="light"
                            placement="bottom"
                            content={(
                              item.max !== undefined ? (
                                <div>
                                  <span className="font-semibold ms-1">Priced Items:</span>
                                  <div className="flex flex-col">
                                    <span className="text-sm font-normal">Price applies to items over the item count. Does NOT need to be priced.</span>
                                    <span className="text-sm font-normal">Max is equal to the item count without a price. Max can be infinite,</span>
                                    <span className="text-sm font-normal">press delete while max is equal to 0 while editing max quantity.</span>
                                    <span className="text-sm font-normal">Selected collections allow the client to pick pictures from those collections.</span>
                                    <span className="text-sm font-normal">Item count MUST be greater than or equal to 0, max MUST be greater than</span>
                                    <span className="text-sm font-normal">or equal to item count. Price, discount and collections are optional.</span>
                                    <span className="text-sm font-normal">Can designate whether item selections must be unique.</span>
                                  </div>
                                </div>
                              ) : (
                              item.quantities !== undefined && item.dependent === undefined? (
                                <div>
                                  <span className="font-semibold ms-1">Default Items:</span>
                                  <div className="flex flex-col">
                                    <span className="text-sm font-normal">Simple item with a quantity, must be greater than 1.</span>
                                  </div>
                                </div>
                              ) : (
                              item.dependent !== undefined && item.quantities !== undefined? (
                                <div>
                                  <span className="font-semibold ms-1">Dependent Items:</span>
                                  <div className="flex flex-col">
                                    <span className="text-sm font-normal">Item must depend on a priced or tiered item. Price applies</span>
                                    <span className="text-sm font-normal">per quantity of the priced item. Baseline is equal</span>
                                    <span className="text-sm font-normal">to the number of items for the priced item or the max tier.</span>
                                  </div>
                                </div>
                              ) : (
                                <div>
                                  <span className="font-semibold ms-1">Tiered Items:</span>
                                  <div className="flex flex-col">
                                    <span className="text-sm font-normal">Item that has tiered pricing. Lower bound must be greater than 1.</span>
                                    <span className="text-sm font-normal">Upper bound item quantity must be equal to the quantity before it.</span>
                                    <span className="text-sm font-normal">Can insert items above or below individual items, must be</span>
                                    <span className="text-sm font-normal">at least 2 items of space to insert. Minimum of two statements.</span>
                                  </div>
                                </div>
                              )))
                            )}
                          >
                            <HiOutlineInformationCircle className="text-gray-400" size={24} />
                          </Tooltip>
                        ) : (
                          <Tooltip
                            style="light"
                            content={(<span>Select an item type</span>)}
                          >
                            <HiOutlineExclamationCircle className="text-red-500" size={24} />
                          </Tooltip>
                        )}
                        <Dropdown
                          color="gray"
                          label={item.max === undefined && item.quantities === undefined && item.statements === undefined && item.dependent === undefined ? (
                            'Select Type'
                          ) : (
                            item.max !== undefined ? (
                              'Priced'
                            ) : (
                            item.quantities !== undefined && item.dependent === undefined ? (
                              'Default'
                            ) : (
                            item.dependent !== undefined ? (
                              'Dependent'
                            ) : (
                              'Tiered'
                            )))
                          )}
                        >
                          <Dropdown.Item 
                            className="flex flex-row gap-2"
                            onClick={() => {
                              if(
                                item.max !== undefined || 
                                item.statements !== undefined || 
                                item.dependent !== undefined ||
                                (item.max === undefined && item.quantities === undefined && item.statements === undefined && item.dependent === undefined)
                              ) {
                                const tempPackage: Package = {
                                  ...props.selectedPackage,
                                  items: props.selectedPackage.items.map((pItem) => pItem.id === item.id ? ({
                                    ...item,
                                    max: undefined,
                                    hardCap: undefined,
                                    statements: undefined,
                                    dependent: undefined,
                                    quantities: 1
                                  }) : pItem)
                                }
                      
                                props.parentUpdatePackage(tempPackage)
                                props.parentUpdatePackageList((prev) => prev.map((pack) => (
                                  pack.id === tempPackage.id ? tempPackage : pack
                                )))
                              }
                            }}
                          >
                            <Radio readOnly checked={item.quantities !== undefined && item.dependent === undefined}/>
                            <span>Default</span>
                          </Dropdown.Item>
                          <Dropdown.Item 
                            className="flex flex-row gap-2"
                            onClick={() => {
                              if(
                                (item.quantities !== undefined && item.dependent === undefined) || 
                                item.statements !== undefined || 
                                item.dependent !== undefined ||
                                (item.max === undefined && item.quantities === undefined && item.statements === undefined && item.dependent === undefined)
                              ) {
                                const tempPackage: Package = {
                                  ...props.selectedPackage,
                                  items: props.selectedPackage.items.map((pItem) => pItem.id === item.id ? ({
                                    ...item,
                                    max: 1,
                                    hardCap: 1,
                                    price: '5.00',
                                    quantities: undefined,
                                    statements: undefined,
                                    dependent: undefined
                                  }) : pItem)
                                }
                      
                                props.parentUpdatePackage(tempPackage)
                                props.parentUpdatePackageList((prev) => prev.map((pack) => (
                                  pack.id === tempPackage.id ? tempPackage : pack
                                )))
                              }
                            }}
                          >
                            <Radio readOnly checked={item.max !== undefined}/>
                            <span>Priced</span>
                          </Dropdown.Item>
                          <Dropdown.Item 
                            className="flex flex-row gap-2"
                            onClick={() => {
                              if(
                                (item.quantities !== undefined && item.dependent === undefined) || 
                                item.max !== undefined || 
                                item.dependent !== undefined || 
                                (item.max === undefined && item.quantities === undefined && item.statements === undefined && item.dependent === undefined)
                              ) {
                                const tempPackage: Package = {
                                  ...props.selectedPackage,
                                  items: props.selectedPackage.items.map((pItem) => pItem.id === item.id ? ({
                                    ...item,
                                    max: undefined,
                                    hardCap: undefined,
                                    quantities: undefined,
                                    statements: ['x <= 5 = 10', 'x > 5 = 5'],
                                    dependent: undefined
                                  }) : pItem)
                                }
                      
                                props.parentUpdatePackage(tempPackage)
                                props.parentUpdatePackageList((prev) => prev.map((pack) => (
                                  pack.id === tempPackage.id ? tempPackage : pack
                                )))
                              }
                            }}
                          >
                            <Radio readOnly checked={item.statements !== undefined}/>
                            <span>Tiered</span>
                          </Dropdown.Item>
                          <Dropdown.Item 
                            className="flex flex-row gap-2"
                            onClick={() => {
                              if(
                                (item.quantities !== undefined && item.dependent === undefined) || 
                                item.max !== undefined || 
                                item.statements !== undefined || 
                                (item.max === undefined && item.quantities === undefined && item.statements === undefined && item.dependent === undefined)
                              ) {
                                const tempPackage: Package = {
                                  ...props.selectedPackage,
                                  items: props.selectedPackage.items.map((pItem) => pItem.id === item.id ? ({
                                    ...item,
                                    max: undefined,
                                    hardCap: undefined,
                                    quantities: 1,
                                    statements: undefined,
                                    dependent: '',
                                    price: '5.00'
                                  }) : pItem)
                                }
                      
                                props.parentUpdatePackage(tempPackage)
                                props.parentUpdatePackageList((prev) => prev.map((pack) => (
                                  pack.id === tempPackage.id ? tempPackage : pack
                                )))
                              }
                            }}
                          >
                            <Radio readOnly checked={item.dependent !== undefined}/>
                            <span>Dependent</span>
                          </Dropdown.Item>
                        </Dropdown>
                        <button 
                          className="hover:text-gray-400" 
                          onClick={() => {
                            const tempPackage: Package = {
                              ...props.selectedPackage,
                              items: props.selectedPackage.items
                                .filter((pItem) => pItem.id !== item.id)
                                .sort((a, b) => a.order - b.order)
                                .map((item, index) => ({ ...item, order: index }))
                            }
                  
                            props.parentUpdatePackage(tempPackage)
                            props.parentUpdatePackageList((prev) => prev.map((pack) => (
                              pack.id === tempPackage.id ? tempPackage : pack
                            )))
                          }}
                        >
                          <HiOutlineXMark size={24} />
                        </button>
                      </div>
                    </div>
                    <div className="border"/>
                    <div className="flex flex-row gap-4 h-full">
                      <div className="w-[45%] ">
                        <AutoExpandTextarea 
                          stateUpdate={(value) => {
                            const tempPackage: Package = {
                              ...props.selectedPackage,
                              items: props.selectedPackage.items.map((pItem) => (pItem.id === item.id ? ({
                                ...item,
                                description: value
                              }) : pItem))
                            }
                  
                            props.parentUpdatePackage(tempPackage)
                            props.parentUpdatePackageList((prev) => prev.map((pack) => (
                              pack.id === tempPackage.id ? tempPackage : pack
                            )))
                          }} 
                          placeholder={"Enter Item Description"}
                          parentValue={item.description}
                        />
                      </div>
                      {item.max !== undefined && (
                        <PricedItem 
                          item={item}
                          selectedPackage={props.selectedPackage}
                          parentUpdatePackage={props.parentUpdatePackage}
                          parentUpdatePackageList={props.parentUpdatePackageList}
                          collectionListQuery={props.collectionListQuery}
                        />
                      )}
                      {item.quantities !== undefined && item.dependent === undefined && (
                        <div className="flex flex-row items-start gap-4">
                          <div className="flex flex-col gap-2">
                            <div className="flex flex-row items-center gap-2">
                              <span className="text-lg font-light italic">Quantity:</span>
                              <div className="flex flex-row items-center gap-2">
                                <button
                                  className="p-1 border rounded-lg aspect-square flex justify-center items-center disabled:opacity-60 enabled:hover:bg-gray-100"
                                  disabled={item.quantities === 1}
                                  onClick={() => {
                                    const tempPackage: Package = {
                                      ...props.selectedPackage,
                                      items: props.selectedPackage.items.map((pItem) => (pItem.id === item.id ? ({
                                        ...item,
                                        quantities: (item.quantities ?? 1) - 1
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
                                  value={item.quantities}
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
                                      items: props.selectedPackage.items.map((pItem) => (pItem.id === item.id ? ({
                                        ...item,
                                        quantities: isNaN(numValue) ? item.quantities === 0 ? Infinity : 0 : numValue
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
                                      items: props.selectedPackage.items.map((pItem) => (pItem.id === item.id ? ({
                                        ...item,
                                        quantities: (item.quantities ?? 1) + 1
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
                          </div>
                        </div>
                      )}
                      {item.statements !== undefined && (
                        <TieredItem 
                          item={item}
                          selectedPackage={props.selectedPackage}
                          parentUpdatePackage={props.parentUpdatePackage}
                          parentUpdatePackageList={props.parentUpdatePackageList}
                        />
                      )}
                      {item.dependent !== undefined && (
                        <DependentItem 
                          item={item}
                          selectedPackage={props.selectedPackage}
                          parentUpdatePackage={props.parentUpdatePackage}
                          parentUpdatePackageList={props.parentUpdatePackageList}
                        />
                      )}
                    </div>
                  </div>
                )
              })
            }
          </div>
        ) : (
          <span className="text-xl italic font-light">Add an item to the package to continue</span>
        )}
        </div>
      </div>
    </>
  )
}