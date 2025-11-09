import { Button, Modal, TextInput, ToggleSwitch } from "flowbite-react"
import { FC, useEffect, useState } from "react"
import { ModalProps } from "."
import { PhotoCollection, PhotoSet, UserTag } from "../../types";
import { textInputTheme } from "../../utils";
import { useMutation } from "@tanstack/react-query";
import { CollectionService, CreateCollectionParams, UpdateCollectionParams } from "../../services/collectionService";
import { v4 } from 'uuid'

interface CreateCollectionProps extends ModalProps {
  CollectionService: CollectionService,
  onSubmit: (collection: PhotoCollection) => void;
  parentCollection?: PhotoCollection
}

export const CreateCollectionModal: FC<CreateCollectionProps> = ({ CollectionService, open, onClose, onSubmit, parentCollection }) => {
    const [collection, setCollection] = useState<PhotoCollection>(parentCollection ? parentCollection : ({
      id: v4(),
      name: '',
      published: false,
      downloadable: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      sets: [] as PhotoSet[],
      tags: [] as UserTag[],
      items: 0
    }))

    useEffect(() => {
      if(collection) {
        setCollection(collection)
      }
    }, [collection])

    const createCollection = useMutation({
      mutationFn: (params: CreateCollectionParams) => CollectionService.createCollectionMutation(params),
      onSuccess: () => onSubmit(collection),
      onSettled: () => clearState()
    })

    const updateCollection = useMutation({
      mutationFn: (params: UpdateCollectionParams) => CollectionService.updateCollectionMutation(params),
      onSuccess: () => onSubmit(collection),
      onSettled: () => clearState()
    })

    function clearState(){
      setCollection({
        id: v4(),
        name: '',
        published: false,
        downloadable: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        sets: [] as PhotoSet[],
        tags: [] as UserTag[],
        items: 0
      })
      onClose()
    }

    const rejectSubmit = (
      collection.name === '' || 
      (parentCollection !== undefined && parentCollection.name !== collection.name) ||
      (parentCollection !== undefined && parentCollection.downloadable !== collection.downloadable)
    )

    return (
        <Modal 
          show={open} 
          size="2xl"
          onClose={() => {
            clearState()
          }}
        >
          <Modal.Header>{collection ? 'Update' : 'Create'} Collection</Modal.Header>
          <Modal.Body>
            <div className="flex flex-col">
              <div className="flex flex-row gap-4 items-center">
                <div className="flex flex-col gap-2 mb-4 w-[60%]">
                    <span className="ms-2 font-medium text-lg" >Photo Collection Name:</span>
                    <TextInput 
                      sizing='md' 
                      theme={textInputTheme} 
                      placeholder="Collection Name" 
                      onChange={(event) => setCollection({
                        ...collection,
                        name: event.target.value
                      })} 
                      value={collection.name}
                    />
                </div>
              </div>
            </div> 
            <div className="flex flex-row justify-end border-t gap-10 mt-4 items-center">
              <ToggleSwitch 
                checked={collection.downloadable} 
                onChange={(checked) => setCollection({...collection, downloadable: checked})} 
                label="Downloadable" 
                className="mt-3"
              />
              <Button 
                className="text-xl w-[40%] max-w-[6rem] mt-4"
                isProcessing={updateCollection.isPending || createCollection.isPending}
                disabled={rejectSubmit}
                onClick={() => {
                  if(!rejectSubmit) {
                    console.log('b')
                    if(parentCollection !== undefined) {
                      updateCollection.mutate({
                        collection: parentCollection,
                        name: collection.name,
                        downloadable: collection.downloadable,
                        published: false, //updates in any way -> unpublish a collection
                        options: {
                          logging: true
                        }
                      })
                    }
                    else {
                      createCollection.mutate({
                        collection: collection,
                        options: {
                          logging: true
                        }
                      })
                    }
                  }
                }}
              >
                {parentCollection !== undefined ? 'Update' : 'Create'}
              </Button>
            </div>
          </Modal.Body>
        </Modal>
    )
}