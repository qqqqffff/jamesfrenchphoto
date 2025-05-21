import { Checkbox, TextInput, Tooltip } from "flowbite-react"
import { textInputTheme } from "../../../utils"
import { Package, UserTag } from "../../../types"
import { Dispatch, SetStateAction } from "react"
import { AutoExpandTextarea } from "../../common/AutoExpandTextArea"
import { TagPicker } from "./TagPicker"
import { PriceInput } from "../../common/PriceInput"

interface DetailsPanelProps {
  selectedPackage: Package,
  parentUpdatePackage: Dispatch<SetStateAction<Package | undefined>>
  parentUpdatePackageList: Dispatch<SetStateAction<Package[]>>
  tags: UserTag[]
  parentUpdateTags: Dispatch<SetStateAction<UserTag[]>>
}

export const DetailsPanel = (props: DetailsPanelProps) => {
  return (
    <div className="grid grid-cols-2 px-10 place-items-center gap-x-10">
      <div className="flex flex-col gap-1 border rounded-lg p-4 w-full h-full">
        <span className="text-xl font-light ms-2 flex flex-row">
          <span>Package Name:</span>
          <Tooltip 
            content={(<span className="whitespace-nowrap text-red-500 italic text-sm">Required Field</span>)}
            style="light"
          >
            <span className="italic text-red-500"><sup>*</sup></span>
          </Tooltip>
        </span>
        <TextInput
          theme={textInputTheme} 
          placeholder="Enter Package Name Here..."
          className="max-w-[400px] min-w-[400px] placeholder:italic"
          sizing="md" 
          onChange={(event) => {
            const tempPackage: Package = {
              ...props.selectedPackage,
              name: event.target.value
            }
            props.parentUpdatePackage(tempPackage)
            props.parentUpdatePackageList((prev) => prev.map((pack) => (
              pack.id === tempPackage.id ? tempPackage : pack
            )))
          }}
          value={props.selectedPackage.name}
          name="PackageName"
          id="PackageName"
        />
        <span className="text-xl font-light ms-2 mt-4">Package Description:</span>
        <div className="max-w-[400px] min-w-[400px]">
          <AutoExpandTextarea
            parentValue={props.selectedPackage.description} 
            stateUpdate={(value) => {
              const tempPackage: Package = {
                ...props.selectedPackage,
                description: value
              }
              props.parentUpdatePackage(tempPackage)
              props.parentUpdatePackageList((prev) => prev.map((pack) => (
                pack.id === tempPackage.id ? tempPackage : pack
              )))
            }} 
            placeholder={"Enter Package Description..."}
          />
        </div>
        <span className="text-xl font-light ms-2 mt-4">Package Price:</span>
        <PriceInput 
          value={props.selectedPackage.price ?? ''}
          className="w-[175px]"
          updateState={(value) => {
            const tempPackage: Package = {
              ...props.selectedPackage,
              price: value
            }

            props.parentUpdatePackage(tempPackage)
            props.parentUpdatePackageList((prev) => prev.map((pack) => (
              pack.id === tempPackage.id ? tempPackage : pack
            )))
          }}
        />
      </div>
      <div className="flex flex-col gap-1 border rounded-lg p-4 w-full h-full">
        <span className="text-xl font-light ms-2 flex flex-row">
          <span>Package Tag:</span>
          <Tooltip 
            content={(<span className="whitespace-nowrap text-red-500 italic text-sm">Required Field</span>)}
            style="light"
          >
            <span className="italic text-red-500"><sup>*</sup></span>
          </Tooltip>
        </span>
        <TagPicker 
          tags={props.tags.filter((tag) => (
            tag.id !== props.selectedPackage.parentTagId && 
            tag.id !== props.selectedPackage.tagId
          ))}
          placeholder='Pick Package Tag...'
          parentPickTag={(value) => {
            const tempPackage: Package = {
              ...props.selectedPackage,
              tagId: value.id
            }
            props.parentUpdatePackage(tempPackage)
            props.parentUpdatePackageList((prev) => prev.map((pack) => (
              pack.id === tempPackage.id ? tempPackage : pack
            )))
          }}
          pickedTag={props.tags.find((tag) => tag.id === props.selectedPackage.tagId)}
          parentUpdateTags={props.parentUpdateTags}      
        />
        <span className="text-xl font-light ms-2 flex flex-row mt-4">
          <span>Package Parent Tag:</span>
        </span>
        <TagPicker 
          tags={props.tags.filter((tag) => (
            tag.id !== props.selectedPackage.parentTagId && 
            tag.id !== props.selectedPackage.tagId &&
            tag.package === undefined
          ))}
          placeholder='Pick Parent Tag...'
          parentPickTag={(value) => {
            const tempPackage: Package = {
              ...props.selectedPackage,
              parentTagId: value.id
            }
            props.parentUpdatePackage(tempPackage)
            props.parentUpdatePackageList((prev) => prev.map((pack) => (
              pack.id === tempPackage.id ? tempPackage : pack
            )))
          }}
          pickedTag={props.tags.find((tag) => tag.id === props.selectedPackage.parentTagId)}
          parentUpdateTags={props.parentUpdateTags}      
        />
        <button 
          className="self-start flex flex-row items-center gap-2 mt-2"
          onClick={() => {
              const tempPackage: Package = {
                ...props.selectedPackage,
                advertise: !props.selectedPackage.advertise
              }
              props.parentUpdatePackage(tempPackage)
              props.parentUpdatePackageList((prev) => prev.map((pack) => (
                pack.id === tempPackage.id ? tempPackage : pack
              )))
            }}
        >
          <Checkbox 
            checked={props.selectedPackage.advertise} 
            readOnly
          />
          <span>Advertise</span>
        </button>
      </div>
    </div>
  )
}