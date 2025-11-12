import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { UserTag } from '../../../types'
import { useQuery } from '@tanstack/react-query'
import { CollectionService } from '../../../services/collectionService'
import { UserService } from '../../../services/userService'
import { TimeslotService } from '../../../services/timeslotService'
import { BuilderPanel } from '../../../components/admin/tagging/BuilderPanel'
import { Schema } from '../../../../amplify/data/resource'
import { V6Client } from '@aws-amplify/api-graphql'
import { TagService } from '../../../services/tagService'

export const Route = createFileRoute('/_auth/admin/dashboard/tagging')({
  component: RouteComponent,
  loader: ({ context }) => {
    const client = context.client as  V6Client<Schema>
    return {
      CollectionService: new CollectionService(client),
      TimeslotService: new TimeslotService(client),
      UserService: new UserService(client),
      TagService: new TagService(client),
    }
  }
})

function RouteComponent() {
  const data = Route.useLoaderData()
  const [tags, setTags] = useState<UserTag[]>([])

  //si will be performed on the selected tag
  const tagsQuery = useQuery(data.TagService.getAllUserTagsQueryOptions({
    siCollections: false,
    siNotifications: false,
    siPackages: {
      siCollections: false,
      siItems: false
    },
    siParticipants: false,
    siTimeslots: false,
    metric: true
  }))
  
  const collectionsQuery = useQuery(
    data.CollectionService.getAllPhotoCollectionsQueryOptions({
      siPaths: false,
      siSets: false,
      siTags: false,
      metric: true
    })
  )

  const timeslotsQuery = useQuery(
    data.TimeslotService.getAllUntaggedTimeslotsQueryOptions({
      metric: true
    })
  )

  const participantQuery = useQuery(data.UserService.getAllParticipantsQueryOptions({
    siCollections: false,
    siNotifications: false,
    siTags: { 
      siChildren: false,
      siCollections: false,
      siPackages: false,
      siTimeslots: false
    },
    siTimeslot: false
  }))

  useEffect(() => {
    if(tagsQuery.data && tagsQuery.data.length > 0) {
      setTags(tagsQuery.data)
    }
  }, [tagsQuery.data])
  
  return (
    <>
      <BuilderPanel 
        CollectionService={data.CollectionService}
        TimeslotService={data.TimeslotService}
        TagService={data.TagService}
        tags={tags}
        tagsQuery={tagsQuery}
        parentUpdateTagList={setTags}
        collectionListQuery={collectionsQuery}
        timeslotListQuery={timeslotsQuery}
        participantsQuery={participantQuery}
      />
    </>
  )
}
