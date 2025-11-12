import { useMutation, useQuery, UseQueryResult } from "@tanstack/react-query";
import { Participant, PhotoCollection, Timeslot, UserTag } from "../../../types";
import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { Alert, Button, FlowbiteColors } from "flowbite-react";
import { DynamicStringEnumKeysOf } from "../../../utils";
import { TimeslotService } from "../../../services/timeslotService";
import { CollectionService } from "../../../services/collectionService";
import { DetailsPanel } from "./DetailsPanel";
import { CollectionsPanel } from "./CollectionsPanel";
import { TimeslotsPanel } from "./TimeslotsPanel";
import { UsersPanel } from "./UsersPanel";
import { ReviewPanel } from "./ReviewPanel";
import { evaluateTagDif } from "../../../functions/tagFunctions";
import { CreateTagParams, TagService, UpdateTagParams } from "../../../services/tagService";

interface BuilderFormProps {
  CollectionService: CollectionService,
  TimeslotService: TimeslotService,
  TagService: TagService,
  selectedTag: UserTag,
  queriedTag?: UserTag,
  tagsQuery: UseQueryResult<UserTag[] | undefined, Error>
  parentUpdateSelectedTag: Dispatch<SetStateAction<UserTag | undefined>>
  parentUpdateTagList: Dispatch<SetStateAction<UserTag[]>>
  //TODO: convert me to infinite query
  collectionListQuery: UseQueryResult<PhotoCollection[] | undefined, Error>
  timeslotListQuery: UseQueryResult<Timeslot[] | undefined, Error>
  participantsQuery: UseQueryResult<Participant[] | undefined, Error>
}

export enum FormStep {
  'Details' = 'Details',
  'Collections' = 'Collections',
  'Timeslots' = 'Timeslots',
  'Users' = 'Users',
  'Review' = 'Review'
}

export const BuilderForm = (props: BuilderFormProps) => {
  const [formStep, setFormStep] = useState<FormStep>(FormStep.Details)
  const [notification, setNotification] = useState<{text: string, color: DynamicStringEnumKeysOf<FlowbiteColors>}>()
  
  let activeTimeout: NodeJS.Timeout | undefined

  const updateTag = useMutation({
    mutationFn: (params: UpdateTagParams) => props.TagService.updateTagMutation(params),
    onSuccess: () => {
      clearTimeout(activeTimeout)
      setNotification({ text: 'Successfully Updated Tag', color: 'green' })
      props.parentUpdateTagList((prev) => prev.map((tag) => (
        tag.id === props.selectedTag.id ? props.selectedTag : tag
      )))
      props.tagsQuery.refetch().finally(() => {
        activeTimeout = setTimeout(() => {
          setNotification(undefined)
          activeTimeout = undefined
        }, 5000)
      })
    },
    onError: () => {
      clearTimeout(activeTimeout)
      setNotification({ text: 'Failed to Update Tag', color: 'red' })
      activeTimeout = setTimeout(() => {
        setNotification(undefined)
        activeTimeout = undefined
      }, 5000)
    }
  })

  const createTag = useMutation({
    mutationFn: (params: CreateTagParams) => props.TagService.createTagMutation(params),
    onSuccess: () => {
      clearTimeout(activeTimeout)
      setNotification({ text: 'Successfully Created Tag', color: 'green' })
      props.parentUpdateTagList((prev) => prev.map((tag) => (
        tag.id === props.selectedTag.id ? props.selectedTag : tag
      )))
      activeTimeout = setTimeout(() => {
        setNotification(undefined)
        activeTimeout = undefined
      }, 5000)
    },
    onError: () => {
      clearTimeout(activeTimeout)
      setNotification({ text: 'Failed to Create Tag', color: 'red' })
      activeTimeout = setTimeout(() => {
        setNotification(undefined)
        activeTimeout = undefined
      }, 5000)
    }
  })

  //all timeslots ascociated with the tag
  const tagTimeslotsQuery = useQuery({
    ...props.TimeslotService.getAllTimeslotsByUserTagQueryOptions(props.selectedTag.id),
    enabled: !props.selectedTag.temporary
  })

  //only need to know that the tag has these collections to start
  const tagCollectionsQuery = useQuery({
    ...props.CollectionService.getAllCollectionsFromUserTagIdQueryOptions(props.selectedTag.id, { 
      siPaths: false, 
      siSets: false, 
      siTags: false
    }),
    enabled: !props.selectedTag.temporary
  })

  //all ascociated participants with the tag
  const tagParticipantsQuery = useQuery({
    ...props.TagService.getAllParticipantsByUserTagQueryOptions(props.selectedTag.id, { 
      siCollections: false, 
      siNotifications: false, 
      siTags: { }, 
      siTimeslot: false
    }),
    enabled: !props.selectedTag.temporary
  })

  useEffect(() => {
    if(tagTimeslotsQuery.data && tagTimeslotsQuery.data.length > 0) {
      const tempTag: UserTag = {
        ...props.selectedTag,
        timeslots: tagTimeslotsQuery.data
      }

      props.parentUpdateSelectedTag(tempTag)
      props.parentUpdateTagList((prev) => prev.map((tag) => tag.id === tempTag.id ? tempTag : tag))
    }
  }, [tagTimeslotsQuery.data])

  useEffect(() => {
    if(tagCollectionsQuery.data && tagCollectionsQuery.data.length > 0) {
      const tempTag: UserTag = {
        ...props.selectedTag,
        collections: tagCollectionsQuery.data
      }

      props.parentUpdateSelectedTag(tempTag)
      props.parentUpdateTagList((prev) => prev.map((tag) => tag.id === tempTag.id ? tempTag : tag))
    }
  }, [tagCollectionsQuery.data])

  useEffect(() => {
    if(tagParticipantsQuery.data && tagParticipantsQuery.data.length > 0) {
      const tempTag: UserTag = {
        ...props.selectedTag,
        participants: tagParticipantsQuery.data ?? []
      }

      props.parentUpdateSelectedTag(tempTag)
      props.parentUpdateTagList((prev) => prev.map((tag) => tag.id === tempTag.id ? tempTag : tag))
    }
  }, [tagParticipantsQuery.data])

  useEffect(() => {
    setFormStep(FormStep.Details)
  }, [props.queriedTag])

  const handleNext = () => {
    switch(formStep) {
      case FormStep.Details:
        setFormStep(FormStep.Collections)
        return
      case FormStep.Collections:
        setFormStep(FormStep.Timeslots)
        return
      case FormStep.Timeslots:
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
      case FormStep.Collections:
        setFormStep(FormStep.Details)
        return
      case FormStep.Timeslots:
        setFormStep(FormStep.Collections)
        return
      case FormStep.Users:
        setFormStep(FormStep.Timeslots)
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
      case FormStep.Collections:
        return 1
      case FormStep.Timeslots:
        return 2
      case FormStep.Users:
        return 3
      case FormStep.Review:
        return 4
    }
  }

  const evaluateAllowedNext = (step: FormStep) => {
    switch(step) {
      case FormStep.Details:
        return (
          props.selectedTag.name === '' ||
          props.selectedTag.name === 'Unnamed Tag'
        )
      case FormStep.Collections:
      case FormStep.Timeslots:
      case FormStep.Users:
      case FormStep.Review:
        return false
      default:
        return true
    }
  }

  return (
    <div className="flex flex-col h-full relative">
      {notification && (
        <Alert
          color={notification.color}
          className="text-lg w-[90%] absolute mt-8 self-center z-20"
          onDismiss={() => setNotification(undefined)}
        >
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
                    {index < 4 && (
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
            selectedTag={props.selectedTag}
            parentUpdateTag={props.parentUpdateSelectedTag}
          />
        ) : (
        formStep === FormStep.Collections ? (
          <CollectionsPanel 
            selectedTag={props.selectedTag}
            parentUpdateTag={props.parentUpdateSelectedTag}
            collectionsQuery={props.collectionListQuery}
          />
        ) : (
        formStep === FormStep.Timeslots ? (
          <TimeslotsPanel 
            selectedTag={props.selectedTag}
            parentUpdateTag={props.parentUpdateSelectedTag}
            timeslotQuery={props.timeslotListQuery}
            participantQuery={props.participantsQuery}
          />
        ) : (
        formStep === FormStep.Users ? (
          <UsersPanel 
            selectedTag={props.selectedTag}
            parentUpdateTag={props.parentUpdateSelectedTag}
            participantQuery={props.participantsQuery}
          />
        ) : (
          <ReviewPanel 
            selectedTag={props.selectedTag}
            participantQuery={props.participantsQuery}
          />
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
                evaluateAllowedNext(FormStep.Review) || (
                  props.queriedTag &&
                  !evaluateTagDif(
                    {
                      ...props.queriedTag,
                      collections: tagCollectionsQuery.data,
                      timeslots: tagTimeslotsQuery.data,
                      participants: tagParticipantsQuery.data ?? []
                    },
                    props.selectedTag
                  )
                )
                
              }
              isProcessing={createTag.isPending || updateTag.isPending}
              onClick={() => {
                if(props.selectedTag.temporary) {
                  createTag.mutate({
                    tag: props.selectedTag,
                    options: {
                      logging: true,
                      metric: true
                    }
                  })
                }
                //asumption is that if updating queried package must exist
                else if(props.queriedTag) {
                  updateTag.mutate({
                    tag: {
                      ...props.queriedTag,
                      collections: tagCollectionsQuery.data,
                      timeslots: tagTimeslotsQuery.data,
                      participants: tagParticipantsQuery.data ?? []
                    },
                    ...props.selectedTag,
                    options: {
                      logging: true,
                      metric: true
                    }
                  })
                }
              }}
            >{props.selectedTag.temporary ? 'Create' : 'Update'}</Button>
          )}
        </div>
      </div>
    </div>
  )
}