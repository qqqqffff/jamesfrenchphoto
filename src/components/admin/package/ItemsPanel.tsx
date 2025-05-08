import { Button, Dropdown, Radio, TextInput } from "flowbite-react"
import { HiBars3, HiOutlineMinus, HiOutlinePlus, HiOutlinePlusCircle, HiOutlineXMark } from 'react-icons/hi2'
import { Package } from "../../../types"
import { Dispatch, SetStateAction } from "react"
import { v4 } from 'uuid'
import { textInputTheme } from "../../../utils"
import { AutoExpandTextarea } from "../../common/AutoExpandTextArea"
import { PriceInput } from "../../common/PriceInput"

interface ItemsPanelProps {
  selectedPackage: Package
  parentUpdatePackage: Dispatch<SetStateAction<Package | undefined>>
  parentUpdatePackageList: Dispatch<SetStateAction<Package[]>>
}

export const ItemsPanel = (props: ItemsPanelProps) => {
  return (
    <div className="flex flex-col gap-2 w-full px-10">
      <div className="flex flex-row w-full justify-end mb-2">
        <Button color="gray" onClick={() => {
          const tempPackage: Package = {
            ...props.selectedPackage,
            items: [...props.selectedPackage.items, {
              id: v4(),
              name: '',
              packageId: props.selectedPackage.id,
            }]
          }

          props.parentUpdatePackage(tempPackage)
          props.parentUpdatePackageList((prev) => prev.map((pack) => (
            pack.id === tempPackage.id ? tempPackage : pack
          )))
        }}>
          <HiOutlinePlusCircle size={20} className="me-1"/>
          <span>Create Item</span>
        </Button>
      </div>
      {props.selectedPackage.items.length > 0 ? (
        <div className="grid grid-cols-2 place-items-center gap-x-10 gap-y-4">
          {props.selectedPackage.items.map((item, index) => {
            return (
              <div className="flex flex-col rounded-lg border px-4 py-4 w-full gap-2" key={index}>
                <div className="w-full flex flex-row items-center justify-between" key={index}>
                  <div className="flex flex-row items-center gap-4">
                    <HiBars3 size={24}/>
                    <TextInput 
                      theme={textInputTheme}
                      placeholder="Enter Item Name"
                      className="max-w-[300px] min-w-[300px]"
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
                    />
                  </div>
                  <div className="flex flex-row gap-4">
                    <Dropdown
                      color="gray"
                      label={item.max === undefined && item.quantities === undefined ? (
                        'Select Type'
                      ) : (
                        item.max !== undefined && item.quantities === undefined ? (
                          'Selectable'
                        ) : (
                          'Default'
                        )
                      )}
                    >
                      <Dropdown.Item 
                        className="flex flex-row gap-2"
                        onClick={() => {
                          if(item.max !== undefined || (item.max === undefined && item.quantities === undefined)) {
                            const tempPackage: Package = {
                              ...props.selectedPackage,
                              items: props.selectedPackage.items.map((pItem) => pItem.id === item.id ? ({
                                ...item,
                                max: undefined,
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
                        <Radio readOnly checked={item.quantities !== undefined}/>
                        <span>Default</span>
                      </Dropdown.Item>
                      <Dropdown.Item 
                        className="flex flex-row gap-2"
                        onClick={() => {
                          if(item.quantities !== undefined || (item.max === undefined && item.quantities === undefined)) {
                            const tempPackage: Package = {
                              ...props.selectedPackage,
                              items: props.selectedPackage.items.map((pItem) => pItem.id === item.id ? ({
                                ...item,
                                max: 1,
                                quantities: undefined
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
                        <span>Selectable</span>
                      </Dropdown.Item>
                    </Dropdown>
                    <button 
                      className="hover:text-gray-400" 
                      onClick={() => {
                        const tempPackage: Package = {
                          ...props.selectedPackage,
                          items: props.selectedPackage.items.filter((pItem) => pItem.id !== item.id)
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
                <div className="flex flex-row gap-4">
                  <div className="w-[52%]">
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
                    />
                  </div>
                  {item.max && (
                    <div className="flex flex-col gap-2">
                      <div className="flex flex-row items-center gap-2">
                        <span className="text-lg font-light italic">Items:</span>
                        <div className="flex flex-row items-center gap-2">
                          <button
                            className="p-1 border rounded-lg aspect-square flex justify-center items-center disabled:opacity-60 enabled:hover:bg-gray-100"
                            disabled={item.max === 1}
                            onClick={() => {
                              const tempPackage: Package = {
                                ...props.selectedPackage,
                                items: props.selectedPackage.items.map((pItem) => (pItem.id === item.id ? ({
                                  ...item,
                                  max: (item.max ?? 1) - 1
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
                            className="min-w-[100px] max-w-[100px]" 
                            value={item.max}
                            onChange={(event) => {
                              const input = event.target.value

                              if(input === '') return

                              if(!/^\d+$/.test(input)) {
                                return
                              }

                              const numValue = parseInt(input)

                              if(numValue === 0) {
                                return
                              }

                              const tempPackage: Package = {
                                ...props.selectedPackage,
                                items: props.selectedPackage.items.map((pItem) => (pItem.id === item.id ? ({
                                  ...item,
                                  max: numValue
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
                                  max: (item.max ?? 1) + 1
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
                        item={item}
                        selectedPackage={props.selectedPackage}
                        parentUpdatePackage={props.parentUpdatePackage}
                        parentUpdatePackageList={props.parentUpdatePackageList}
                      />
                    </div>
                  )}
                  {item.quantities && (
                    <></>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="border rounded-lg py-4 flex items-center justify-center">
          <span className="text-xl italic font-light">Add an item to the package to continue</span>
        </div>
      )}
    </div>
    
  )
}