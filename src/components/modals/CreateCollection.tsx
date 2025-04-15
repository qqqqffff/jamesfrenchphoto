import { Badge, Button, Dropdown, Label, Modal, TextInput, ToggleSwitch } from "flowbite-react"
import { FC, FormEvent, useState } from "react"
import { HiOutlineCheckCircle } from "react-icons/hi2"
import { ModalProps } from "."
import { PhotoCollection, UserTag } from "../../types";
import { badgeColorThemeMap, textInputTheme } from "../../utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createCollectionMutation, CreateCollectionParams, updateCollectionMutation, UpdateCollectionParams } from "../../services/collectionService";

interface CreateCollectionProps extends ModalProps {
  onSubmit: (collection: PhotoCollection) => void;
  availableTags: UserTag[]
  collection?: PhotoCollection
}

export const CreateCollectionModal: FC<CreateCollectionProps> = ({ open, onClose, onSubmit, availableTags, collection }) => {
    const [name, setName] = useState('')
    const [downloadable, setDownloadable] = useState(false)
    const [selectedTags, setSelectedTags] = useState<UserTag[]>([])

    const [submitting, setSubmitting] = useState(false)
    const [loaded, setLoaded] = useState(false)
    const queryClient = useQueryClient()

    if(!loaded && collection){
      setName(collection.name)
      setSelectedTags(collection.tags)
      setLoaded(true)
    }

    const createCollection = useMutation({
      mutationFn: (params: CreateCollectionParams) => createCollectionMutation(params),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['photoPaths']})
        queryClient.invalidateQueries({ queryKey: ['photoCollection']})
      },
      onSettled: (data) => {
        //TODO: error handling
        if(data) {
          onSubmit(data)
          clearState()
        }
      }
    })
    const updateCollection = useMutation({
      mutationFn: (params: UpdateCollectionParams) => updateCollectionMutation(params),
      onSettled: (data) => {
        if(data){
          onSubmit(data)
          clearState()
        }
      }
    })

    async function handleUploadPhotos(event: FormEvent){
      event.preventDefault()
      setSubmitting(true)

      if(!name){
        //TODO: throw error
        return
      }

      const createCollectionParams: CreateCollectionParams = {
        name,
        tags: selectedTags,
        downloadable,
      }

      if(collection) {
        const updateCollectionParams: UpdateCollectionParams = {
          ...createCollectionParams,
          collection: collection,
          published: collection.published,
        }
        await updateCollection.mutateAsync(updateCollectionParams)
      }
      else{
        await createCollection.mutateAsync(createCollectionParams)
      }
    }

    function clearState(){
      setName('')
      setSubmitting(false)
      setLoaded(false)
      setSelectedTags([])
      onClose()
    }

    return (
        <Modal 
          show={open} 
          size="2xl"
          className='font-main' 
          onClose={() => {
            clearState()
          }}
        >
          <Modal.Header>{collection ? 'Update' : 'Create'} Collection</Modal.Header>
          <Modal.Body>
            <form onSubmit={handleUploadPhotos}>
              <div className="flex flex-col">
                <div className="flex flex-row gap-4 items-center">
                  <div className="flex flex-col gap-2 mb-4 w-[60%]">
                      <Label className="ms-2 font-medium text-lg" htmlFor="name">Photo Collection Name:</Label>
                      <TextInput sizing='md' theme={textInputTheme} placeholder="Event Name" type="name" id="name" name="name" onChange={(event) => setName(event.target.value)} value={name}/>
                  </div>
                  <div className="flex flex-col gap-2 mb-4 w-[40%]">
                    <Label className="ms-2 font-medium text-lg" htmlFor="name">User Tag(s):</Label>
                    <Dropdown
                      label={availableTags.length > 0 ? 'Select' : 'None'} 
                      color='light' dismissOnClick={false} disabled={availableTags.length == 0}>
                      {availableTags.map((tag, index) => {
                        const selected = selectedTags.find((st) => st.id === tag.id)
                        return (
                          <Dropdown.Item key={index} 
                            as="button"
                            className="flex flex-row gap-2 text-left items-center"
                            onClick={() => {
                              if(selected){
                                setSelectedTags(selectedTags.filter((st) => st.id !== tag.id))
                              }
                              else {
                                setSelectedTags([...selectedTags, tag])
                              }
                            }}
                          >
                            {selected ? (
                              <HiOutlineCheckCircle className="text-green-400 mt-1 ms-2"/>
                            ) : (<p className="p-3"></p>)}
                              <span className={`${tag.color ? `text-${tag.color}` : ''}`}>{tag.name}</span>
                          </Dropdown.Item>
                          )
                        })}
                    </Dropdown>
                  </div>
                </div>
                <div className='flex flex-row gap-2 items-center justify-center mb-2'>
                    {
                      selectedTags.map((tag, index) => {
                        return (<Badge theme={badgeColorThemeMap} color={tag.color ? tag.color : 'light'} key={index} className="py-1 text-md">{tag.name}</Badge>)
                      })
                    }
                </div>
              </div> 
              <div className="flex flex-row justify-end border-t gap-10 mt-4 items-center">
                <ToggleSwitch checked={downloadable} onChange={setDownloadable} label="Downloadable" className="mt-3"/>
                <Button className="text-xl w-[40%] max-w-[8rem] mt-4" type="submit" isProcessing={submitting}>{collection ? 'Update' : 'Create'}</Button>
              </div>
            </form>
          </Modal.Body>
        </Modal>
    )
}