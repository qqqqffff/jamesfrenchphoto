import { Dispatch, SetStateAction, useState } from "react";
import { Package, UserTag } from "../../../types";
import { Button, TextInput, Tooltip } from "flowbite-react";
import { textInputTheme } from "../../../utils";
import { AutoExpandTextarea } from "../../common/AutoExpandTextArea";
import { TagPicker } from "./TagPicker";
import { ItemsPanel } from "./ItemsPanel";

interface BuilderFormProps {
  selectedPackage: Package
  parentUpdateSelectedPackage: Dispatch<SetStateAction<Package | undefined>>,
  parentUpdatePackageList: Dispatch<SetStateAction<Package[]>>
  tags: UserTag[],
  parentUpdateTags: Dispatch<SetStateAction<UserTag[]>>
}
enum FormStep {
  'Details' = 'Details',
  'Items' = 'Items',
  'Users' = 'Users',
  'Review' = 'Review'
}
//TODO: add search params state initialization
export const BuilderForm = (props: BuilderFormProps) => {
  const [formStep, setFormStep] = useState<FormStep>(FormStep.Details)

  const handleNext = () => {
    switch(formStep) {
      case FormStep.Details:
        setFormStep(FormStep.Items)
        return
      case FormStep.Items:
        setFormStep(FormStep.Users)
        return
      case FormStep.Users:
        setFormStep(FormStep.Review)
        return
      case FormStep.Review:
        setFormStep(FormStep.Details)
        return
    }
  }

  const handlePrevious = () => {
    switch(formStep) {
      case FormStep.Details:
        setFormStep(FormStep.Review)
        return
      case FormStep.Items:
        setFormStep(FormStep.Details)
        return
      case FormStep.Users:
        setFormStep(FormStep.Items)
        return
      case FormStep.Review:
        setFormStep(FormStep.Users)
        return
    }
  }

  const currentStepIndex = (step: FormStep) => {
    switch(step) {
      case FormStep.Details:
        return 0
      case FormStep.Items:
        return 1
      case FormStep.Users:
        return 2
      case FormStep.Review:
        return 3
    }
  }

  const evaluateAllowedNext = (() => {
    switch(formStep) {
      case FormStep.Details:
        return props.selectedPackage.name === '' || props.selectedPackage.tagId === '' || props.selectedPackage.name === 'Unnamed Package'
      case FormStep.Items:
        return true
      case FormStep.Users:
        return true
      case FormStep.Review:
        return true
      default: 
        return true
    }
  })()

  const FormDetailStep = () => {
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
              props.parentUpdateSelectedPackage(tempPackage)
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
                props.parentUpdateSelectedPackage(tempPackage)
                props.parentUpdatePackageList((prev) => prev.map((pack) => (
                  pack.id === tempPackage.id ? tempPackage : pack
                )))
              }} 
              placeholder={"Enter Package Description..."}
            />
          </div>
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
            tags={props.tags} 
            parentPickTag={(value) => {
              const tempPackage: Package = {
                ...props.selectedPackage,
                tagId: value.id
              }
              props.parentUpdateSelectedPackage(tempPackage)
              props.parentUpdatePackageList((prev) => prev.map((pack) => (
                pack.id === tempPackage.id ? tempPackage : pack
              )))
            }}
            pickedTag={props.tags.find((tag) => tag.id === props.selectedPackage.tagId)}
            parentUpdateTags={props.parentUpdateTags}      
          />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full border">
      <div className="p-6 flex flex-row items-center w-full justify-center">
        <div className="mb-4 ms-[17.5%] w-[80%]">
          <div className="flex items-center justify-between">
            {Object.keys(FormStep).map((step, index) => {
              const stepIndex = currentStepIndex(formStep)
              return (
                <div key={index} className="relative flex-1">
                  <div className="flex items-center">
                    <div 
                      className={`
                        w-8 h-8 rounded-full flex items-center justify-center border-2
                        ${index < stepIndex ? 'bg-blue-600 border-blue-600 text-white' :
                          index === stepIndex ? 'border-blue-600 text-blue-600' : 
                          'border-gray-300 text-gray-300'
                        }
                      `}
                    >
                      {index < stepIndex ? (
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule='evenodd' />
                        </svg>
                      ) : (
                        <span>{index + 1}</span>
                      )}
                    </div>
                    {index < 3 && (
                      <div 
                        className={`flex-1 h-0.5 mx-2 ${index < stepIndex ? 'bg-blue-600' : 'bg-gray-300'}`}
                      />
                    )}
                  </div>
                  <div className={`absolute top-10 w-full text-start text-xs font-medium ${index <= stepIndex ? 'text-blue-600' : 'text-gray-500'}`}>
                    {step}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
      <div className="w-full flex flex-col">
        {formStep === FormStep.Details ? (
          FormDetailStep()
        ) : (
        formStep === FormStep.Items ? (
          <ItemsPanel 
            selectedPackage={props.selectedPackage}
            parentUpdatePackage={props.parentUpdateSelectedPackage}
            parentUpdatePackageList={props.parentUpdatePackageList}
          />
        ) : (
          <></>
        ))}
        <div className="w-full flex flex-row items-center justify-end gap-2 col-start-2 mt-4 pe-10">
          {formStep !== FormStep.Details && (
            <Button color='gray' onClick={handlePrevious}>Previous</Button>
          )}
          {formStep !== FormStep.Review && (
            <Button 
              onClick={handleNext} 
              disabled={evaluateAllowedNext}
            >Next</Button>
          )}
        </div>
      </div>
    </div>
  )
}