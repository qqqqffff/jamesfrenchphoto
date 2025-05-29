import { Button, Checkbox, Modal, TextInput } from "flowbite-react"
import { ModalProps } from "."
import { InfiniteData, UseInfiniteQueryResult } from "@tanstack/react-query"
import { GetInfinitePackageItemsData } from "../../services/packageService"
import { useCallback, useEffect, useRef, useState } from "react"
import { PackageItem } from "../../types"
import { textInputTheme } from "../../utils"
import { HiOutlineMinus, HiOutlinePlus } from "react-icons/hi"

interface PackageItemLoaderProps extends ModalProps {
  allPackageItems: PackageItem[]
  allPackageItemsQuery: UseInfiniteQueryResult<InfiniteData<GetInfinitePackageItemsData, unknown>, Error>
  updatePackageItems: (packageItems: {item: PackageItem, quantity: number}[]) => void
}

export const PackageItemLoader = (props: PackageItemLoaderProps) => {
  const [search, setSearch] = useState<string>('')
  const [selectedPackageItems, setSelectedPackageItems] = useState<{item: PackageItem, quantity: number}[]>([])
  const observerRef = useRef<IntersectionObserver | null>(null)
  const triggerRef = useRef<HTMLDivElement | null>(null)
  const itemsRef = useRef<Map<string, HTMLDivElement | null>>(new Map())

  useEffect(() => {
    if(props.allPackageItems.length === 0) return

    if(!observerRef.current) {
      observerRef.current = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if(
            entry.isIntersecting &&
            props.allPackageItemsQuery.hasNextPage
          ) {
            props.allPackageItemsQuery.fetchNextPage()
          }
        })
      }, {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
      })
    }

    const triggerReturn: PackageItem | undefined = props.allPackageItems?.[
      (props.allPackageItems.length - 6) > 0 ? 0 : (props.allPackageItems.length - 6)
    ]

    const Bel = itemsRef.current.get(triggerReturn?.id ?? '')
    if(Bel && triggerRef.current) {
      observerRef.current.observe(Bel)
    }

    return () => {
      if(observerRef.current) {
        observerRef.current.disconnect()
      }

      observerRef.current = null
    }
  }, [
    triggerRef.current,
    props.allPackageItemsQuery.data,
    props.allPackageItemsQuery.hasNextPage,
    props.allPackageItemsQuery.isLoading,
    props.allPackageItemsQuery.fetchNextPage,
  ])

  const setItemRef = useCallback((el: HTMLDivElement | null, id: string) => {
    if(el) {
      itemsRef.current.set(id, el)
    }
  }, [])

  const emptyFilter = (
    props.allPackageItems.length > 0 &&
    props.allPackageItems.filter((item) => item.name.trim().toLowerCase().includes(search.trim().toLowerCase())).length === 0
  )

  if(
    emptyFilter &&
    props.allPackageItemsQuery.hasNextPage &&
    !props.allPackageItemsQuery.isFetchingNextPage
  ) {
    props.allPackageItemsQuery.fetchNextPage()
  }

  return (
    <Modal
      show={props.open}
      onClose={() => {
        props.onClose()
        setSelectedPackageItems([])
        setSearch('')
      }}
    >
      <Modal.Header>Load Package Item</Modal.Header>
      <Modal.Body className="flex flex-col">
        <TextInput 
          theme={textInputTheme}
          sizing="sm"
          className="w-full max-w-[400px] mb-2 self-center" 
          placeholder="Search Package Items"
          onChange={(event) => {
            setSearch(event.target.value)
          }}
          value={search}
        />
        <div className="flex flex-col items-start mx-[12%] border rounded-lg px-2 py-1">
          {props.allPackageItems.length > 0 && !emptyFilter ? (
            props.allPackageItems
              .filter((item) => item.name.trim().toLowerCase().includes(search.trim().toLowerCase()))
              .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
              .map((item, index) => {
                const selected = selectedPackageItems.find((packItem) => packItem.item.id === item.id)
                return (
                  <div 
                    className="flex flex-row gap-2" 
                    ref={el => setItemRef(el, item.id)}
                    key={index}
                  >
                    <button
                      className="flex flex-row items-center gap-2 hover:border-gray-200 hover:rounded-full border-transparent border hover:bg-gray-50 px-4 py-1"
                      
                      onClick={(e) => {
                        e.stopPropagation()
                        if(selected !== undefined) {
                          setSelectedPackageItems(selectedPackageItems.filter((packItem) => packItem.item.id !== item.id))
                        }
                        else {
                          setSelectedPackageItems([...selectedPackageItems, {item: item, quantity: 1}])
                        }
                      }}
                    >
                      <Checkbox 
                        readOnly 
                        onClick={() => {
                          if(selected !== undefined) {
                            setSelectedPackageItems(selectedPackageItems.filter((packItem) => packItem.item.id !== item.id))
                          }
                          else {
                            setSelectedPackageItems([...selectedPackageItems, {item: item, quantity: 1}])
                          }
                        }} 
                        checked={selected !== undefined}
                      />
                      <span className="truncate">{item.name}</span>
                    </button>
                    {selected && (
                        <div className="flex flex-row items-center gap-2">
                          <button
                            className="
                              p-1 border rounded-lg aspect-square flex justify-center items-center 
                              disabled:opacity-60 enabled:hover:bg-gray-100 disabled:hover:cursor-not-allowed
                            "
                            disabled={selected.quantity === 1}
                            onClick={() => {
                              setSelectedPackageItems((prev) => prev
                                .map((sItem) => (sItem.item.id === item.id) ? ({ ...sItem, quantity: sItem.quantity - 1 }) : sItem)
                              )
                            }}
                          >
                            <HiOutlineMinus size={16} />
                          </button>
                          <TextInput 
                            theme={textInputTheme}
                            sizing="sm"
                            className="min-w-[42px] max-w-[42px]" 
                            placeholder="0"
                            value={selected.quantity}
                            onChange={(event) => {
                              const input = event.target.value.charAt(0) === '0' ? event.target.value.slice(1) : event.target.value
              
                              if(!/^\d+$/g.test(input)) {
                                return
                              }
              
                              const numValue = parseInt(input)
                              
                              if(numValue <= 0) {
                                setSelectedPackageItems((prev) => prev
                                  .map((sItem) => (sItem.item.id === item.id) ? ({ ...sItem, quantity: 1 }) : sItem)
                                )
                              }
              
                              setSelectedPackageItems((prev) => prev
                                .map((sItem) => (sItem.item.id === item.id) ? ({ ...sItem, quantity: isNaN(numValue) ? 1 : numValue }) : sItem)
                              )
                            }}
                          />
                          <button
                            className="p-1 border rounded-lg aspect-square flex justify-center items-center hover:bg-gray-100"
                            onClick={() => {
                              setSelectedPackageItems((prev) => prev
                                .map((sItem) => (sItem.item.id === item.id) ? ({ ...sItem, quantity: sItem.quantity + 1 }) : sItem)
                              )
                            }}
                          >
                            <HiOutlinePlus size={20} />
                          </button>
                        </div>
                      )}
                  </div>
                )
              })
          ) : (
            emptyFilter ? (
              <div>No Results Found</div>
            ) : (
              <div>No Items</div>
            )
          )}
        </div>
      </Modal.Body>
      <Modal.Footer
        className="flex flex-row-reverse w-full gap-4"
      >
        <Button size="sm" disabled={selectedPackageItems.length == 0} onClick={() => {
          props.updatePackageItems(selectedPackageItems)
          props.onClose()
          setSelectedPackageItems([])
          setSearch('')
        }}>Add Items</Button>
        <Button size="sm" color="gray" onClick={() => {
          props.onClose()
          setSelectedPackageItems([])
          setSearch('')
        }}>Cancel</Button>
      </Modal.Footer>
    </Modal>
  )
}