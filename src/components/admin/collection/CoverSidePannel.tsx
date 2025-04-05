import { Checkbox, Datepicker, Label, Radio } from "flowbite-react"
import { Dispatch, MutableRefObject, SetStateAction } from "react"
import { HiOutlineUpload } from "react-icons/hi"
import { PhotoCollection } from "../../../types"
import { defaultColors } from "../../../utils"
import { BiSolidSquareRounded } from "react-icons/bi"

interface CoverSidePannel {
  setUploadCoverVisible: Dispatch<SetStateAction<boolean>>
  fileUpload: MutableRefObject<File | null>
  updateParentCollection: Dispatch<SetStateAction<PhotoCollection | undefined>>
  collection: PhotoCollection
}

export const CoverSidePannel = (props: CoverSidePannel) => {

  return (
    <>
      <div className="flex flex-row items-center justify-between w-full">
        <Label className="text-lg ms-2">Cover Options</Label>
        <label htmlFor="cover-upload" className="flex flex-row gap-2 border border-gray-300 items-center hover:bg-gray-100 rounded-xl py-1 px-3 me-2">
          <span className="">Upload Cover</span>
          <HiOutlineUpload size={20} />
          <input 
            id='cover-upload' 
            accept=""
            type='file' 
            className="hidden"
            multiple={false}
            onChange={(event) => {
              if(event.target.files){
                props.fileUpload.current = Array.from(event.target.files)[0]
                props.setUploadCoverVisible(true)
              }
              event.target.value = ''
            }} 
          />
        </label>
      </div>
      <div className="border w-full"></div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 w-full">
        <div className="flex flex-col border border-gray-300 items-center rounded-lg pt-1 pb-4 px-2 w-full gap-2">
          <span className="italic underline underline-offset-2">Image Placement</span>
          <button 
            className="self-start flex flex-row gap-2 items-center ms-2"
            onClick={() => {
              //TODO: connect api call
              props.updateParentCollection((prev) => {
                if(prev) {
                  const temp: PhotoCollection = {
                    ...prev,
                    coverType: {
                      ...prev.coverType,
                      placement: 'center'
                    }
                  }
                  return temp
                }
              })
            }}
          >
            <Radio 
              checked={!props.collection.coverType?.placement || props.collection.coverType.placement === 'center'}
              readOnly
            />
            <span>Center</span>
          </button>
          <button 
            className="self-start flex flex-row gap-2 items-center ms-2"
            onClick={() => {
              //TODO: connect api call
              props.updateParentCollection((prev) => {
                if(prev) {
                  const temp: PhotoCollection = {
                    ...prev,
                    coverType: {
                      ...prev.coverType,
                      placement: 'left'
                    }
                  }
                  return temp
                }
              })
            }}
          >
            <Radio 
              checked={props.collection.coverType?.placement === 'left'}
              readOnly
            />
            <span>Left</span>
          </button>
          <button 
            className="self-start flex flex-row gap-2 items-center ms-2"
            onClick={() => {
              //TODO: connect api call
              props.updateParentCollection((prev) => {
                if(prev) {
                  const temp: PhotoCollection = {
                    ...prev,
                    coverType: {
                      ...prev.coverType,
                      placement: 'right'
                    }
                  }
                  return temp
                }
              })
            }}
          >
            <Radio 
              checked={props.collection.coverType?.placement === 'right'}
              readOnly
            />
            <span>Right</span>
          </button>
        </div>
        <div className="flex flex-col border border-gray-300 items-center rounded-lg pt-1 pb-4 px-2 w-full gap-2">
          <span className="italic underline underline-offset-2">Text Placement</span>
          <button 
            className="self-start flex flex-row gap-2 items-center ms-2"
            onClick={() => {
              //TODO: connect api call
              props.updateParentCollection((prev) => {
                if(prev) {
                  const temp: PhotoCollection = {
                    ...prev,
                    coverType: {
                      ...prev.coverType,
                      textPlacement: 'center'
                    }
                  }
                  return temp
                }
              })
            }}
          >
            <Radio 
              checked={!props.collection.coverType?.textPlacement || props.collection.coverType.textPlacement === 'center'}
              readOnly
            />
            <span>Center</span>
          </button>
          <button 
            className="self-start flex flex-row gap-2 items-center ms-2"
            onClick={() => {
              //TODO: connect api call
              props.updateParentCollection((prev) => {
                if(prev) {
                  const temp: PhotoCollection = {
                    ...prev,
                    coverType: {
                      ...prev.coverType,
                      textPlacement: 'top'
                    }
                  }
                  return temp
                }
              })
            }}
          >
            <Radio 
              checked={props.collection.coverType?.textPlacement === 'top'}
              readOnly
            />
            <span>Top</span>
          </button>
          <button 
            className="self-start flex flex-row gap-2 items-center ms-2"
            onClick={() => {
              //TODO: connect api call
              props.updateParentCollection((prev) => {
                if(prev) {
                  const temp: PhotoCollection = {
                    ...prev,
                    coverType: {
                      ...prev.coverType,
                      textPlacement: 'bottom'
                    }
                  }
                  return temp
                }
              })
            }}
          >
            <Radio 
              checked={props.collection.coverType?.textPlacement === 'bottom'}
              readOnly
            />
            <span>Bottom</span>
          </button>
        </div>
        <div className="flex flex-col border border-gray-300 items-center rounded-lg pt-1 pb-4 px-2 w-full gap-2">
          <span className="italic underline underline-offset-2">Background Color</span>
          <div className="grid grid-cols-4 gap-x-2 gap-y-2">
            {defaultColors.map((color, index) => {
              const className = 'fill-' + color + ' cursor-pointer'
              return (
                <BiSolidSquareRounded 
                  key={index} 
                  size={24} 
                  className={className} 
                  onClick={() => {
                    if(color !== props.collection.coverType?.bgColor) { 
                      props.updateParentCollection((prev) => {
                        if(prev) {
                          const temp: PhotoCollection = {
                            ...prev,
                            coverType: {
                              ...prev.coverType,
                              bgColor: color
                            }
                          }
                          return temp
                        }
                      })
                    } else {
                      props.updateParentCollection((prev) => {
                        if(prev) {
                          const temp: PhotoCollection = {
                            ...prev,
                            coverType: {
                              ...prev.coverType,
                              bgColor: undefined
                            }
                          }
                          return temp
                        }
                      })
                    }
                  }}
                />
              )
            })}
          </div>
        </div>
        <div className="flex flex-col border border-gray-300 items-center rounded-lg pt-1 pb-4 px-2 w-full gap-2">
          <span className="italic underline underline-offset-2">Text Color</span>
          <div className="grid grid-cols-4 gap-x-2 gap-y-2">
            {defaultColors.map((color, index) => {
              const className = 'fill-' + color + ' cursor-pointer'
              return (
                <BiSolidSquareRounded 
                  key={index} 
                  size={24} 
                  className={className} 
                  onClick={() => {
                    if(color !== props.collection.coverType?.textColor) { 
                      props.updateParentCollection((prev) => {
                        if(prev) {
                          const temp: PhotoCollection = {
                            ...prev,
                            coverType: {
                              ...prev.coverType,
                              textColor: color
                            }
                          }
                          return temp
                        }
                      })
                    } else {
                      props.updateParentCollection((prev) => {
                        if(prev) {
                          const temp: PhotoCollection = {
                            ...prev,
                            coverType: {
                              ...prev.coverType,
                              textColor: undefined
                            }
                          }
                          return temp
                        }
                      })
                    }
                  }}
                />
              )
            })}
          </div>
        </div>
      </div>
      <div className="flex flex-col border border-gray-300 items-center rounded-lg pt-1 pb-4 px-2 w-full gap-2">
        <div className="flex flex-row w-full justify-between px-8">
          <span className="italic underline underline-offset-2">Collection Date</span>
          <button 
            className="flex flex-row gap-2 items-center ms-2"
            onClick={() => {
              //TODO: connect api call
              props.updateParentCollection((prev) => {
                if(prev) {
                  const temp: PhotoCollection = {
                    ...prev,
                    coverType: {
                      ...prev.coverType,
                      date: props.collection.coverType?.date === 'none' ? undefined : 'none'
                    }
                  }
                  return temp
                }
              })
            }}
          >
            <Checkbox 
              checked={props.collection.coverType?.date !== 'none'}
              className="text-sm"
              readOnly
            />
            <span className="text-sm">Display Date</span>
          </button>
        </div>
        <Datepicker 
          sizing="md"
          value={props.collection.coverType?.date && props.collection.coverType.date !== 'none' ? new Date(props.collection.coverType.date) : new Date(props.collection.createdAt)}
          onChange={(event) => {
            if(event) {
              props.updateParentCollection((prev) => {
                if(prev) {
                  const temp: PhotoCollection = {
                    ...prev,
                    coverType: {
                      ...prev.coverType,
                      date: event.toISOString()
                    }
                  }
                  return temp
                }
              })
            }
          }}
        />
      </div>
    </>
  )
}