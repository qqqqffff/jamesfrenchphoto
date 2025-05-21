import { Modal, TextInput } from "flowbite-react"
import { ModalProps } from "."
import { InfiniteData, UseInfiniteQueryResult } from "@tanstack/react-query"
import { GetInfinitePackageItemsData } from "../../services/packageService"
import { useCallback, useEffect, useRef, useState } from "react"
import { PackageItem } from "../../types"
import { textInputTheme } from "../../utils"

interface PackageItemLoaderProps extends ModalProps {
  allPackageItems: PackageItem[]
  allPackageItemsQuery: UseInfiniteQueryResult<InfiniteData<GetInfinitePackageItemsData, unknown>, Error>
}

export const PackageItemLoader = (props: PackageItemLoaderProps) => {
  const [search, setSearch] = useState<string>('')
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
      onClose={() => props.onClose()}
    >
      <Modal.Header>Load Package Item</Modal.Header>
      <Modal.Body>
        <TextInput 
          theme={textInputTheme}
          sizing="sm"
          className="w-full max-w-[400px] mb-2" 
          placeholder="Search"
          onChange={(event) => {
            setSearch(event.target.value)
          }}
          value={search}
        />
        {props.allPackageItems.length > 0 && !emptyFilter ? (
          props.allPackageItems
            .filter((item) => item.name.trim().toLowerCase().includes(search.trim().toLowerCase()))
            .map((item, index) => {
              return (
                <div
                  className="relative"
                  ref={el => setItemRef(el, item.id)}
                  key={index}
                >
                  {item.name}
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
      </Modal.Body>
    </Modal>
  )
}