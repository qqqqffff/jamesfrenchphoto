import { useMutation, useQuery } from "@tanstack/react-query"
import { PhotoCollection } from "../../../types"
import { getFavoritesFromPhotoCollectionQueryOptions } from "../../../services/photoSetService"
import Loading from "../../common/Loading"
import { HiOutlineDownload, HiOutlineEye } from "react-icons/hi"
import { Tooltip } from "flowbite-react"
import { DownloadData, DownloadToast } from "../../common/DownloadToast"
import { useState } from "react"
import { downloadFavoritesMutation, DownloadFavoritesMutationOptions } from "../../../services/photoPathService"
import { v4 } from 'uuid'

interface FavoritePannelProps {
  collection: PhotoCollection
}

export const FavoritePannel = (props: FavoritePannelProps) => {
  const [downloads, setDownloads] = useState<DownloadData[]>([])
  const favorites = useQuery(
    getFavoritesFromPhotoCollectionQueryOptions(props.collection, { metric: true })
  )

  const download = useMutation({
    mutationFn: (params: DownloadFavoritesMutationOptions) => downloadFavoritesMutation(params),
    onSettled: (file) => {
      console.log(file)
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

  return (
    <>
      <DownloadToast 
        downloads={downloads}
        setDownloads={setDownloads}
      />
      <div
        className="grid grid-cols-2 gap-y-2 gap-x-1"
      >
        {favorites.isFetching ? (
          <span
            className="absolute place-self-center flex flex-row gap-1"
          >
            Loading<Loading />
          </span>
        ) : (
          Array.from(favorites.data?.entries() ?? []).map((entry, index) => {
            const nameString = entry[0].data ? (
              `${entry[0].data.first}, ${entry[0].data.last}`
            ) : (
              undefined
            )
            return (
              <div 
                key={index}
                className="rounded-lg border border-gray-300 grid grid-cols-3 px-2 py-1 items-center"
              >
                <div className="flex flex-col text-start self-start">
                  <span className="font-semibold">{nameString}</span>
                  <span className="font-light italic text-sm">{entry[0].user.email}</span>
                </div>
                <span className="text-xl font-light place-self-center">
                  <span className="italic">Favorites:</span>
                  <span className="ms-1">{entry[1].length}</span>
                </span>
                <div className="flex flex-row items-center place-self-end gap-2">
                  <Tooltip content={'Preview Favorites'} style="light">
                    <button
                      onClick={() => {

                      }}
                    >
                      <HiOutlineEye size={24} />
                    </button>
                  </Tooltip>
                  <Tooltip content={'Download Favorites'} style="light">
                    <button 
                      onClick={() => {
                        const id = v4()
                        const newDownload: DownloadData = {
                          id: id,
                          state: 'inprogress',
                          progress: 0,
                          totalItems: entry[1].length,
                          display: true
                        }
                        download.mutate({
                          downloadId: id,
                          zipName: `favorites_${nameString ?? 'fnu'}.zip`,
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
        )}
      </div>
    </>
  )
}