import { Button, Label, Modal, TextInput, ToggleSwitch } from "flowbite-react"
import { FC, FormEvent, useState } from "react"
import { ModalProps } from "."
import { PhotoCollection } from "../../types";
import { textInputTheme } from "../../utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createCollectionMutation, CreateCollectionParams, updateCollectionMutation, UpdateCollectionParams } from "../../services/collectionService";

interface CreateCollectionProps extends ModalProps {
  onSubmit: (collection: PhotoCollection) => void;
  collection?: PhotoCollection
}

export const CreateCollectionModal: FC<CreateCollectionProps> = ({ open, onClose, onSubmit, collection }) => {
    const [name, setName] = useState('')
    const [downloadable, setDownloadable] = useState(collection?.downloadable ?? false)

    const [submitting, setSubmitting] = useState(false)
    const [loaded, setLoaded] = useState(false)
    const queryClient = useQueryClient()

    if(!loaded && collection){
      setName(collection.name)
      setDownloadable(collection.downloadable)
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
        downloadable: downloadable,
      }

      if(collection) {
        const updateCollectionParams: UpdateCollectionParams = {
          ...createCollectionParams,
          collection: collection,
          published: collection.published,
          downloadable: downloadable,
          options: {
            logging: true
          }
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