import { FC, useEffect, useState } from "react";
import { ModalProps } from ".";
import { Button, Checkbox, Datepicker, Dropdown, Label, Modal, TextInput } from "flowbite-react";
import { PhotoCollection, Timeslot, UserTag } from "../../types";
import { currentDate, DAY_OFFSET, defaultColors, GetColorComponent, textInputTheme } from "../../utils";
import { BiSolidSquareRounded } from "react-icons/bi";
import { CompactSlotComponent, SlotComponent } from "../timeslot/Slot";
import { useMutation, useQuery } from "@tanstack/react-query";
import { getAllPhotoCollectionsQueryOptions } from "../../services/collectionService";
import { getAllTimeslotsByDateQueryOptions } from "../../services/timeslotService";
import { createTagMutation, CreateTagParams, updateTagMutation, UpdateTagParams } from "../../services/userService";

interface CreateTagProps extends ModalProps {
  existingTag?: UserTag
  onSubmit: (tag: UserTag) => void
}

export const CreateTagModal: FC<CreateTagProps> = ({ open, onClose, existingTag, onSubmit }) => {
  const [activeCollections, setActiveCollections] = useState<PhotoCollection[]>(existingTag?.collections ?? [])
  const [activeTimeslots, setActiveTimeslots] = useState<Timeslot[]>(existingTag?.timeslots ?? [])
  const [activeColor, setActiveColor] = useState<string | undefined>(existingTag?.color)
  const [activeDate, setActiveDate] = useState<Date>(currentDate)
  const [tagName, setTagName] = useState<string>(existingTag?.name ?? '')

  const collections = useQuery(getAllPhotoCollectionsQueryOptions({ siPaths: false, siSets: false, siTags: false }))
  const timeslots = useQuery(getAllTimeslotsByDateQueryOptions(activeDate))

  useEffect(() => {
    if(existingTag) {
      setActiveTimeslots(existingTag.timeslots ?? [])
      setActiveCollections(existingTag.collections ?? [])
      setActiveColor(existingTag.color)
      setTagName(existingTag.name)
    }
  }, [existingTag])

  const createTag = useMutation({
    mutationFn: (params: CreateTagParams) => createTagMutation(params),
    onSuccess: (data) => {
      if(data) {
        onSubmit(data)
      }
    }
  })

  const updateTag = useMutation({
    mutationFn: (params: UpdateTagParams) => updateTagMutation(params),
    onSuccess: (data) => onSubmit(data)
  })

  function clearStates() {
    setActiveCollections([])
    setActiveTimeslots([])
    setActiveColor(undefined)
    setActiveDate(currentDate)
  }

  return (
      <Modal 
        size="2xl"
        show={open} 
        onClose={() => {
          clearStates()
          onClose()
        }}
      >
        <Modal.Header>{existingTag ? 'Update Tag' : 'Create a New Tag'}</Modal.Header>
        <Modal.Body>
          <div className="grid grid-cols-2 gap-8 mb-4">
            <div className="flex flex-col gap-2">
              <Label className="ms-2 font-medium text-lg" htmlFor="name">Name:</Label>
              <TextInput 
                sizing='md' 
                theme={textInputTheme} 
                color={activeColor} 
                placeholder="Tag Name" 
                type="text" 
                id="name" 
                name="name" 
                value={tagName}
                onChange={(event) => setTagName(event.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2 h-full justify-end">
              <Dropdown 
                color={'light'} 
                label={(<span className="h-min">Select Collections</span>)} 
                placement="bottom-start"
                className=""
                dismissOnClick={false}
              >
                {collections.data?.map((collection, index) => {
                  const tempMap = activeCollections.map((collection) => collection.id)
                  return (
                    <Dropdown.Item 
                      key={index} 
                      className="flex flex-row gap-2 w-full items-center justify-start" 
                      onClick={() => {
                        let temp = [...activeCollections]
                        
                        if(tempMap.includes(collection.id)){
                          temp = temp.filter((t) => t.id !== collection.id)
                        }
                        else{
                          temp.push(collection)
                        }
                        
                        setActiveCollections(temp)
                      }}
                    >
                      <Checkbox className="" checked={tempMap.includes(collection.id)} readOnly />
                      <span>{collection.name}</span>
                    </Dropdown.Item>
                  )
                })}
              </Dropdown>
            </div>
          </div>
          
          <div className="flex flex-col items-center justify-center gap-2 border-b border-gray-500 pb-4">
              <div className="flex flex-row items-center justify-center gap-4">
                  <Label className="ms-2 font-medium text-lg" htmlFor="name">Timeslots for:</Label>
                  <Datepicker minDate={currentDate} defaultValue={new Date(currentDate.getTime() + DAY_OFFSET)} onChange={(date) => {
                      if(date) setActiveDate(date)
                  }}/>
              </div>
              <div className="grid grid-cols-2 gap-2 w-full border-gray-500 border rounded-lg px-2 py-4 max-h-[250px] overflow-auto">
                  {(timeslots.data ?? []).length > 0 ? timeslots.data?.map((timeslot, index) => {
                    const selected = activeTimeslots.filter((ts) => ts.id === timeslot.id).length > 0
                    const selectedBg = selected ? 'bg-gray-200' : ''
                    return (
                      <button key={index} className={`hover:bg-gray-200 rounded-lg ${selectedBg}`} type='button' onClick={() => {
                        if(!selected){
                          setActiveTimeslots([...activeTimeslots, timeslot])
                        }
                        else {
                          const timeslots = activeTimeslots.filter((ts) => ts.id !== timeslot.id)
                          setActiveTimeslots(timeslots)
                        }
                      }}>
                        <SlotComponent timeslot={timeslot} participant={timeslot.participant} tag={timeslot.tag} />
                      </button>
                    )
                  }
                ) : (
                  <Label className="text-lg italic text-gray-500">No timeslots for this date</Label>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2 w-full border-gray-500 rounded-lg px-2 py-2 max-h-[250px] overflow-auto">
                  {activeTimeslots.length > 0 ? activeTimeslots.map((timeslot) => {
                    return (
                      <button className="hover:bg-red-300 rounded-lg" type='button' onClick={() => {
                        const timeslots = activeTimeslots.filter((ts) => ts.id !== timeslot.id)
                        setActiveTimeslots(timeslots)
                      }}>
                        <CompactSlotComponent timeslot={timeslot} participant={timeslot.participant} tag={timeslot.tag} />
                      </button>
                    )
                  }) : (
                    <Label className="text-lg italic text-gray-500">No selected timeslots</Label>
                  )}
              </div>
          </div>
          <div className="flex flex-col items-center justify-center mb-4 mt-2">
            <Label className="text-lg" htmlFor="name">Color: <GetColorComponent activeColor={activeColor} /></Label>
            <div className="grid grid-cols-7 gap-2">
              {defaultColors.map((color, index) => {
                const className = 'fill-' + color + ' cursor-pointer'
                return (<BiSolidSquareRounded key={index} size={48} className={className} onClick={() => setActiveColor(color)}/>)
              })}
            </div>
            <Button className="mt-2" type='button' onClick={() => setActiveColor(undefined)} color="light">Clear</Button>
          </div>
        </Modal.Body>
        <Modal.Footer className="flex flex-row justify-end">
          <Button 
            className="disabled:cursor-not-allowed" 
            isProcessing={updateTag.isPending || createTag.isPending}
            disabled={tagName === ''}
            onClick={() => {
              if(existingTag) {
                updateTag.mutate({
                  tag: existingTag,
                  name: tagName,
                  color: activeColor,
                  timeslots: activeTimeslots,
                  collections: activeCollections,
                  options: {
                    logging: true
                  }
                })
              }
              else {
                createTag.mutate({
                  name: tagName,
                  color: activeColor,
                  timeslots: activeTimeslots,
                  collections: activeCollections,
                  options: {
                    logging: true
                  }
                })
              }
            }}
          >
            <span>{existingTag ? 'Update' : 'Create'}</span>
          </Button>
        </Modal.Footer>
      </Modal>
  )
}