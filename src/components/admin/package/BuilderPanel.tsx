import { HiOutlinePlusCircle } from "react-icons/hi2"
import { Package, PackageItem, PhotoCollection, UserTag } from "../../../types"
import { Dispatch, SetStateAction, useState } from "react"
import { v4 } from 'uuid'
import { BuilderForm } from "./BuilderForm"
import { UseInfiniteQueryResult, InfiniteData, UseQueryResult } from "@tanstack/react-query"
import { GetInfinitePackageItemsData } from "../../../services/packageService"
import Loading from "../../common/Loading"

interface BuilderPanelProps {
  packages: Package[]
  packagesQuery: UseQueryResult<Package[] | undefined, Error>
  parentUpdatePackages: Dispatch<SetStateAction<Package[]>>
  tags: UserTag[],
  parentUpdateTags: Dispatch<SetStateAction<UserTag[]>>
  allPackageItems: PackageItem[],
  allPackageItemsQuery: UseInfiniteQueryResult<InfiniteData<GetInfinitePackageItemsData, unknown>, Error>
  collectionListQuery: UseQueryResult<PhotoCollection[] | undefined, Error>
}

export const BuilderPanel = (props: BuilderPanelProps) => {
  const [selectedPackage, setSelectedPackage] = useState<Package>()

  return (
    <div className="flex flex-row mx-4 my-4 gap-4 min-h-[96vh] max-h-[96vh] ">
      <div className="border border-gray-400 flex flex-col gap-2 rounded-2xl py-2 px-2 max-w-[350px] min-w-[350px] overflow-y-auto">
        <div className="flex flex-row items-center w-full justify-between px-4 border-b pb-2 border-b-gray-400">
          <span className="text-2xl text-start">Packages</span>
          <button 
            className="flex flex-row items-center gap-2 enabled:hover:text-gray-500 enabled:hover:bg-gray-100 px-3 py-1 border rounded-xl disabled:text-gray-400"
            disabled={props.packages.some((pack) => pack.temporary)}
            onClick={() => {
              const temp = [
                ...props.packages
              ]
              const tempPackage: Package = {
                id: v4(),
                name: 'Unnamed Package',
                items: [],
                tagId: '',
                parentTagId: '',
                createdAt: new Date().toISOString(),
                advertise: true,
                temporary: true
              }
              temp.push(tempPackage)

              props.parentUpdatePackages(temp)
              setSelectedPackage(tempPackage)
            }}
          >
            <span>Create Package</span>
            <HiOutlinePlusCircle size={20}/>
          </button>
        </div>
        <div className="flex flex-col w-full">
          {props.packagesQuery.isLoading ? (
            <span className="flex flex-row text-start gap-1 italic font-light ms-4">
              <span>Loading</span>
              <Loading />
            </span>
          ) : (
            props.packages.map((pack, index) => {
              const selected = pack.id === selectedPackage?.id
              return (
                <div className="flex flex-col" key={index}>
                  <div className="flex flex-row items-center w-full px-4">
                    <span className="text-2xl">&bull;</span>
                    <button
                      className={`
                        flex flex-row gap-2 items-center w-full mx-1 ps-2 pe-1 justify-between 
                        border border-transparent rounded-lg hover:text-gray-500 hover:bg-gray-100
                        ${!selected ? 'hover:border-gray-200' : 'bg-gray-200 border-gray-500 hover:border-gray-900'}
                      `}
                      onClick={() => {
                        setSelectedPackage((prev) => {
                          if(prev?.id !== pack.id) return pack
                          else return undefined
                        })
                      }}
                    >
                      <span className="w-full truncate text-left">{pack.name}</span>
                    </button>
                  </div>
                </div>
              )
            }))
          }
        </div>
      </div>
      <div className="w-full border border-gray-400 flex flex-col rounded-2xl">
        {selectedPackage ? (
          <BuilderForm 
            selectedPackage={selectedPackage}
            queriedPackage={props.packagesQuery.data?.find((pack) => pack.id === selectedPackage.id)}
            packagesQuery={props.packagesQuery}
            parentUpdateSelectedPackage={setSelectedPackage}
            tags={props.tags}
            parentUpdateTags={props.parentUpdateTags}
            parentUpdatePackageList={props.parentUpdatePackages}
            allPackageItems={props.allPackageItems}
            allPackageItemsQuery={props.allPackageItemsQuery}
            collectionListQuery={props.collectionListQuery}
          />
        ) : (
          <span className="text-2xl text-gray-500 italic font-light self-center mt-4">Create or Select a Package to get Started</span>
        )}
      </div>
    </div>
  )
}