import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { Package, PackageItem, PhotoCollection, UserTag } from "../../../types";
import { Alert, Badge, Button, FlowbiteColors } from "flowbite-react";
import { ItemsPanel } from "./ItemsPanel";
import { DetailsPanel } from "./DetailsPanel";
import { createPackageMutation, CreatePackageParams, getAllPackageItemsQueryOptions, GetInfinitePackageItemsData, updatePackageMutation, UpdatePackageParams } from "../../../services/packageService";
import { UseQueryResult, useQuery, useMutation, UseInfiniteQueryResult, InfiniteData } from "@tanstack/react-query";
import { getAllParticipantsByUserTagQueryOptions } from "../../../services/userService";
import { UsersPanel } from "./UsersPanel";
import { PackageCard } from "../../common/package/PackageCard";
import { badgeColorThemeMap, DynamicStringEnumKeysOf } from "../../../utils";
import { evaluatePackageDif } from "../../../functions/packageFunctions";

interface BuilderFormProps {
  selectedPackage: Package
  queriedPackage?: Package
  packagesQuery: UseQueryResult<Package[] | undefined, Error>
  parentUpdateSelectedPackage: Dispatch<SetStateAction<Package | undefined>>,
  parentUpdatePackageList: Dispatch<SetStateAction<Package[]>>
  tags: UserTag[],
  parentUpdateTags: Dispatch<SetStateAction<UserTag[]>>
  allPackageItems: PackageItem[],
  allPackageItemsQuery: UseInfiniteQueryResult<InfiniteData<GetInfinitePackageItemsData, unknown>, Error> //TODO: implement me later
  collectionListQuery: UseQueryResult<PhotoCollection[] | undefined, Error>
}

enum FormStep {
  'Details' = 'Details',
  'Items' = 'Items',
  'Users' = 'Users',
  'Review' = 'Review'
}

export const BuilderForm = (props: BuilderFormProps) => {
  const [formStep, setFormStep] = useState<FormStep>(FormStep.Details)
  const [notification, setNotification] = useState<{text: string, color: DynamicStringEnumKeysOf<FlowbiteColors>}>()

  const participantsQuery = useQuery(getAllParticipantsByUserTagQueryOptions(
    props.selectedPackage.tagId, {
      siCollections: false,
      siNotifications: false,
      siTags: { },
      siTimeslot: false,
    }
  ))

  const parentParticipantQuery = useQuery(getAllParticipantsByUserTagQueryOptions(
    props.selectedPackage.parentTagId, {
      siCollections: false,
      siNotifications: false,
      siTags: { },
      siTimeslot: false,
    }
  ))

  let activeTimeout: NodeJS.Timeout | undefined

  const updatePackage = useMutation({
    mutationFn: (params: UpdatePackageParams) => updatePackageMutation(params),
    onSuccess: () => {
      clearTimeout(activeTimeout)
      setNotification({ text: 'Successfully Updated Package', color: 'green' })
      activeTimeout = setTimeout(() => {
        setNotification(undefined)
        activeTimeout = undefined
      }, 5000)
    },
    onError: () => {
      clearTimeout(activeTimeout)
      setNotification({ text: 'Failed to Update Package', color: 'red' })
      activeTimeout = setTimeout(() => {
        setNotification(undefined)
        activeTimeout = undefined
      }, 5000)
    }
  })

  const createPackage = useMutation({
    mutationFn: (params: CreatePackageParams) => createPackageMutation(params),
    onSuccess: () => {
      clearTimeout(activeTimeout)
      setNotification({ text: 'Successfully Created Package', color: 'green' })
      activeTimeout = setTimeout(() => {
        setNotification(undefined)
        activeTimeout = undefined
      }, 5000)
      props.packagesQuery.refetch()
    },
    onError: () => {
      clearTimeout(activeTimeout)
      setNotification({ text: 'Failed to Create Package', color: 'red' })
      activeTimeout = setTimeout(() => {
        setNotification(undefined)
        activeTimeout = undefined
      }, 5000)
    }
  })

  //package item api call enabled if package isn't temporary
  const packageItemsQuery = useQuery({
    ...getAllPackageItemsQueryOptions(props.selectedPackage.id, { siCollectionItems: true }),
    enabled: !props.selectedPackage.temporary
  })

  useEffect(() => {
    if(packageItemsQuery.data && packageItemsQuery.data.length > 0) {
      const tempPackage: Package = {
        ...props.selectedPackage,
        items: packageItemsQuery.data
      }

      props.parentUpdateSelectedPackage(tempPackage)
      props.parentUpdatePackageList((prev) => prev.map((pack) => pack.id === tempPackage.id ? tempPackage : pack))
    }
  }, [packageItemsQuery.data])

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

  const evaluateAllowedNext = (step: FormStep) => {
    switch(step) {
      case FormStep.Details:
        return (
          props.selectedPackage.name === '' || 
          props.selectedPackage.tagId === '' || 
          props.selectedPackage.name === 'Unnamed Package'
        )
      case FormStep.Items:
      case FormStep.Users:
        return (
          validatePackageItems() ||
          props.selectedPackage.items.length == 0 ||
          props.selectedPackage.name === '' || 
          props.selectedPackage.tagId === '' || 
          props.selectedPackage.name === 'Unnamed Package' || 
          props.selectedPackage.parentTagId === ''
        )
      case FormStep.Review:
        return false
      default: 
        return true
    }
  }

  function validatePackageItems() {
    const items = props.selectedPackage.items
    for(let i = 0; i < items.length; i++) {
      const item = items[i]
      //invalid priced item
      if(item.max !== undefined && item.hardCap !== undefined) {
        if(item.max > item.hardCap || item.max < 0) {
          return true
        }
      }
      //invalid quantity
      if(item.quantities !== undefined && item.quantities < 1) {
        return true
      }
      if(item.statements !== undefined && item.statements.length < 2) {
        //assume that boolean statements will be valid, need at least 2 statements to cover all possible cases
        return true
      }
      //no name
      if(item.name === '') {
        return true
      }
      if(item.dependent !== undefined && (
        item.price === undefined || 
        isNaN(parseFloat(item.price)) ||
        parseFloat(item.price) <= 0 ||
        !items.some((i) => i.id === item.dependent) ||
        item.quantities === undefined ||
        item.quantities <= 0
      )) {
        return true
      }
      //type not selected
      if(item.quantities === undefined && item.statements === undefined && item.max === undefined && item.dependent === undefined) {
        return true
      }
    }
    return false
  }

  const foundTag = props.tags.find((tag) => props.selectedPackage.tagId === tag.id)
  const foundParentTag = props.tags.find((tag) => props.selectedPackage.parentTagId === tag.id)

  return (
    <div className="flex flex-col h-full border relative">
      {notification && (
        <Alert 
          color={notification.color} 
          className="text-lg w-[90%] absolute mt-8 self-center z-20" 
          onDismiss={() => setNotification(undefined)}>
            {notification.text}
          </Alert>
      )}
      <div className="p-6 flex flex-row items-center w-full justify-center">
        <div className="mb-4 ms-[17.5%] w-[80%]">
          <div className="flex items-center justify-between">
            {Object.keys(FormStep).map((step, index, array) => {
              const stepIndex = currentStepIndex(formStep)
              const evaluateNext = index > 0 ? evaluateAllowedNext(array[index - 1] as FormStep) : false
              return (
                <div key={index} className="relative flex-1">
                  <div className="flex items-center">
                    <button 
                      className={`
                        w-8 h-8 rounded-full flex items-center justify-center border-2 
                        ${index === stepIndex || !evaluateNext ? 'border-blue-600 text-blue-600' : 
                           index < stepIndex ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-300 text-gray-300'
                        } enabled:hover:cursor-pointer disabled:hover:cursor-not-allowed
                      `}
                      onClick={() => setFormStep(step as FormStep)}
                      disabled={evaluateNext && (step as FormStep) !== formStep}
                    >
                      {index < stepIndex ? (
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule='evenodd' />
                        </svg>
                      ) : (
                        <span>{index + 1}</span>
                      )}
                    </button>
                    {index < 3 && (
                      <div 
                        className={`flex-1 h-0.5 mx-2 ${index < stepIndex || !evaluateNext ? 'bg-blue-600' : 'bg-gray-300'}`}
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
          <DetailsPanel 
            selectedPackage={props.selectedPackage}
            tags={props.tags}
            parentUpdateTags={props.parentUpdateTags}
            parentUpdatePackage={props.parentUpdateSelectedPackage}
            parentUpdatePackageList={props.parentUpdatePackageList}
          />
        ) : (
        formStep === FormStep.Items ? (
          <ItemsPanel 
            selectedPackage={props.selectedPackage}
            parentUpdatePackage={props.parentUpdateSelectedPackage}
            parentUpdatePackageList={props.parentUpdatePackageList}
            allPackageItems={props.allPackageItems}
            allPackageItemsQuery={props.allPackageItemsQuery}
            collectionListQuery={props.collectionListQuery}
          />
        ) : (
        formStep === FormStep.Users ? (
          <UsersPanel 
            parentParticipantQuery={parentParticipantQuery}
            participantQuery={participantsQuery}
          />
        ) : (
        formStep === FormStep.Review ? (
          <div className="flex flex-row px-10 gap-8">
            <PackageCard 
              package={props.selectedPackage}
              collectionList={props.collectionListQuery.data ?? []}
            />
            <div className="border rounded-lg flex flex-col gap-2 px-4 py-2">
              <span className="pb-1 border-b font-semibold">Package Details</span>
              <div className="flex flex-row w-full gap-2 items-center">
                <span>Package Tag:</span>
                <Badge theme={badgeColorThemeMap} color={foundTag?.color ? foundTag.color : 'light'} size="lg">{foundTag?.name}</Badge>
              </div>
              {foundParentTag !== undefined && (
                <div className="flex flex-row w-full gap-2 items-center">
                  <span>Parent Tag:</span>
                  <Badge theme={badgeColorThemeMap} color={foundParentTag.color ? foundParentTag.color : 'light'} size="lg">{foundParentTag.name}</Badge>
                </div>
              )}
              <span 
              className={`
                ${props.selectedPackage.advertise ? 'font-semibold' : 'font-light italic'}
              `}
              >{props.selectedPackage.advertise ? 'Currently Advertising' : 'Not Currently Advertising'}</span>
            </div>
          </div>
        ) : (
          <></>
        ))))}
        <div className="w-full flex flex-row items-center justify-end gap-2 col-start-2 mt-4 pe-10">
          {formStep !== FormStep.Details && (
            <Button color='gray' onClick={handlePrevious}>Previous</Button>
          )}
          {formStep !== FormStep.Review && (
            <Button 
              onClick={handleNext} 
              disabled={evaluateAllowedNext(formStep)}
            >Next</Button>
          )}
          {formStep === FormStep.Review && (
            <Button
              disabled={
                props.queriedPackage && 
                !evaluatePackageDif(
                  {
                    ...props.queriedPackage,
                    items: packageItemsQuery.data ?? []
                  },
                  props.selectedPackage
                )
              }
              isProcessing={createPackage.isPending || updatePackage.isPending}
              onClick={() => {
                if(props.selectedPackage.temporary) {
                  createPackage.mutate({
                    pack: props.selectedPackage,
                    options: {
                      logging: true,
                      metric: true
                    }
                  })
                }
                //asumption is that if updating queried package must exist
                else if(props.queriedPackage) {
                  updatePackage.mutate({
                    pack: {
                      ...props.queriedPackage,
                      items: packageItemsQuery.data ?? []
                    },
                    ...props.selectedPackage,
                    options: {
                      logging: true,
                      metric: true
                    }
                  })
                }
              }}
            >{props.selectedPackage.temporary ? 'Create' : 'Update'}</Button>
          )}
        </div>
      </div>
    </div>
  )
}