import { Button, Modal, TextInput } from "flowbite-react";
import { ModalProps } from ".";
import { FC, useState } from "react";
import { PhotoCollection } from "../../types";
import { useMutation } from "@tanstack/react-query";
import { createAccessTokenMutation, CreateAccessTokenMutationParams } from "../../services/userService";
import { textInputTheme } from "../../utils";
import { HiOutlineCheckCircle } from 'react-icons/hi2'

interface ShareCollectionModalProps extends ModalProps {
  collection: PhotoCollection
}

export const ShareCollectionModal: FC<ShareCollectionModalProps> = ({ collection, open, onClose }) => {
  const [sharableLink, setSharableLink] = useState<string>()
  const [copiedLink, setCopiedLink] = useState(false)
  
  const getAccessToken = useMutation({
    mutationFn: (params: CreateAccessTokenMutationParams) => createAccessTokenMutation(params),
    onSettled: (data) => {
      if(data){
        const baseUrl = window.location.href.replace(/(http)s?(:\/\/)/g, '')
        const trimmedUrl = baseUrl.substring(0, baseUrl.indexOf('/') + 1) + `photo-collection/${collection.id}?temporaryToken=${data}`

        setSharableLink(trimmedUrl)
      }
    }
  })

  return (
    <Modal
      onClose={() => onClose()}
      show={open}
    >
      <Modal.Header>Share Collection</Modal.Header>
      <Modal.Body>
        <div className="flex flex-row justify-between items-center">
          <span>Sharable Link for <span className="italic">{collection.name}</span></span>
          {!sharableLink && (
            <Button
              size="sm"
              onClick={() => {
                getAccessToken.mutate({
                  collectionId: collection.id,
                })
              }}
            >
              Create
            </Button>
          )}
        </div>
        {sharableLink && (
          <div className="flex flex-col gap-2">
            <div className="flex flex-row gap-10 w-full mt-4">
              <TextInput theme={textInputTheme} value={sharableLink} readOnly className="w-full"/>
              <Button 
                className="flex flex-row gap-1 items-center"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(sharableLink)
                  setCopiedLink(true)
                  setTimeout(() => setCopiedLink(false), 1000)
                }}
              >
                {copiedLink ? (
                  <HiOutlineCheckCircle  size={20}/>
                ) : (
                  <span>Copy</span>
                )}
              </Button>
            </div>
          </div>
        )}
      </Modal.Body>
    </Modal>
  )
}