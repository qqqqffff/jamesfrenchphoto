import { useMutation, useQuery } from "@tanstack/react-query"
import { DownloadData, PhotoCollection } from "../../../types"
import { getFavoritesFromPhotoCollectionQueryOptions } from "../../../services/photoSetService"
import Loading from "../../common/Loading"
import { HiOutlineDownload, HiOutlineEye } from "react-icons/hi"
import { Tooltip } from "flowbite-react"
import { DownloadToast } from "../../common/DownloadToast"
import { useState } from "react"
import { DownloadFavoritesMutationOptions, PhotoPathService } from "../../../services/photoPathService"
import { v4 } from 'uuid'
import { useNavigate } from "@tanstack/react-router"
import { formatTime } from "../../../utils"

interface FavoritePanelProps {
  PhotoPathService: PhotoPathService,
  collection: PhotoCollection
}

export const FavoritePanel = (props: FavoritePanelProps) => {
  const [downloads, setDownloads] = useState<DownloadData[]>([])
  const navigate = useNavigate()

  const favorites = useQuery(
    getFavoritesFromPhotoCollectionQueryOptions(props.collection, { metric: true })
  )

  const download = useMutation({
    mutationFn: (params: DownloadFavoritesMutationOptions) => props.PhotoPathService.downloadFavoritesMutation(params),
    onSettled: (file) => {
      if(file) {
        try {
          const url = window.URL.createObjectURL(file)
          const link = document.createElement('a')
          link.href = url
          link.download = file.name,
          link.click()
          window.URL.revokeObjectURL(url)
        } catch(error) {
          console.error(error)
        }
      }
    }
  })

  const favoriteCheck = 
    Array.from(favorites.data?.entries() ?? []).length == 0 || 
    Array.from(favorites.data?.entries() ?? [])
      .map((entry) => entry[1])
      .reduce((prev, cur) => {
        if(prev && cur.length === 0) {
          return true
        }
        return false
      }, true)

  return (
    <>
      <DownloadToast 
        downloads={downloads}
        setDownloads={setDownloads}
      />
      <div
        className="grid grid-cols-2 gap-y-2 gap-x-1 max-h-[92vh] overflow-auto px-4"
      >
        {favorites.isFetching ? (
          <span
            className="absolute place-self-center flex flex-row"
          >
            Loading<Loading />
          </span>
        ) : (
          favoriteCheck ? (
            <span
              className="absolute place-self-center flex flex-row"
            >
              No Favorites Just Yet.
            </span>
          ) : (
            Array.from(favorites.data?.entries() ?? [])
              .filter((entry) => entry[1].length > 0)
              .map((entry, index) => {
                const nameString = `${entry[0].firstName}, ${entry[0].lastName}`

                let created: Date | undefined = entry[1][0]?.createdAt
                let updated: Date | undefined = entry[1][0]?.updatedAt

                entry[1].forEach((favorite) => {
                  if(favorite.createdAt.getTime() < (created?.getTime() ?? Infinity)){
                    created = favorite.createdAt
                  }
                  if(favorite.updatedAt.getTime() > (updated?.getTime() ?? 0)) {
                    updated = favorite.updatedAt
                  }
                })
                
                const formattedCreatedAt = formatTime(created, { timeString: false }) + ' ' + formatTime(created)  
                const formattedUpdatedAt = formatTime(updated, { timeString: false }) + ' ' + formatTime(updated) 
                
                return (
                  <div 
                    key={index}
                    className="rounded-lg border border-gray-300 grid grid-cols-3 px-2 py-1 items-center"
                  >
                    <div className="flex flex-col h-full place-self-start justify-center">
                      <span className="font-semibold">{nameString}</span>
                      {entry[0].email && (
                        <span className="font-light italic text-sm">{entry[0].email}</span>
                      )}
                    </div>
                    <div className="flex flex-col items-center place-self-center">
                      <span className="text-xl font-light ">
                        <span className="italic underline">Favorites:</span>
                        <span className="ms-1">{entry[1].length}</span>
                      </span>
                      <span className="text-xs">Created At: {formattedCreatedAt}</span>
                      <span className="text-xs">Updated At: {formattedUpdatedAt}</span>
                    </div>
                    
                    <div className="flex flex-row items-center gap-2 h-full place-self-end">
                      <Tooltip content={'Preview Favorites'} style="light">
                        <button
                          className="hover:text-gray-500"
                          disabled={entry[1].length == 0}
                          onClick={() => {
                            navigate({ to: '/favorites-fullscreen', search: { favorites: entry[1].map((favorite) => favorite.id) }})
                          }}
                        >
                          <HiOutlineEye size={24} />
                        </button>
                      </Tooltip>
                      <Tooltip content={'Download Favorites'} style="light">
                        <button 
                          className="hover:text-gray-500"
                          onClick={() => {
                            const id = v4()
                            const newDownload: DownloadData = {
                              id: id,
                              state: 'inprogress',
                              progress: 0,
                              totalItems: entry[1].length,
                              display: true
                            }
                            
                            const createFileName = nameString.replace(', ', '_').toLowerCase()

                            download.mutate({
                              downloadId: id,
                              zipName: `favorites_${createFileName}.zip`,
                              favorites: entry[1],
                              updateProgress: setDownloads,
                              options: {
                                logging: true
                              }
                            })
                            setDownloads([...downloads, newDownload])
                          }}
                        >
                          <HiOutlineDownload size={24} />
                        </button>
                      </Tooltip>
                    </div>
                  </div>
                )
              })
          )
        )}
      </div>
    </>
  )
}