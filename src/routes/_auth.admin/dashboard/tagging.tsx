import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { UserTag } from '../../../types'
import { useQuery } from '@tanstack/react-query'
import { getAllPhotoCollectionsQueryOptions } from '../../../services/collectionService'
import { getAllParticipantsQueryOptions, getAllUserTagsQueryOptions } from '../../../services/userService'
import { getAllUntaggedTimeslotsQueryOptions } from '../../../services/timeslotService'
import { BuilderPanel } from '../../../components/admin/tagging/BuilderPanel'

export const Route = createFileRoute('/_auth/admin/dashboard/tagging')({
  component: RouteComponent,
})

function RouteComponent() {
  const [tags, setTags] = useState<UserTag[]>([])

  //si will be performed on the selected tag
  const tagsQuery = useQuery(getAllUserTagsQueryOptions({
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
    getAllPhotoCollectionsQueryOptions({
      siPaths: false,
      siSets: false,
      siTags: false,
      metric: true
    })
  )

  const timeslotsQuery = useQuery(
    getAllUntaggedTimeslotsQueryOptions({
      metric: true
    })
  )

  const participantQuery = useQuery(getAllParticipantsQueryOptions({
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
