import { useMutation } from "@tanstack/react-query";
import { PhotoCollection } from "../../../types";
import { shareCollectionMutation, ShareCollectionParams } from "../../../services/collectionService";
import { Button } from "flowbite-react";

interface SharePannelProps {
  collection: PhotoCollection
}

export const SharePannel = (props: SharePannelProps) => {
  const share = useMutation({
    mutationFn: (params: ShareCollectionParams) => shareCollectionMutation(params)
  })

  return (
    <>
      <Button
        onClick={() => {
          share.mutate({
            emails: ['1apollo.rowe@gmail.com'],
            header: 'Hello world',
            header2: 'Nice to see you',
            body: 'My Name Jeff',
            footer: 'Subscribe',
            coverPath: props.collection.coverPath ?? '',
            link: '',
            name: props.collection.name,
            options: {
              logging: true
            }
          })
        }}
      >Share</Button>
    </>
  )
}