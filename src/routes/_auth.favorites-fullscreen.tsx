import { useMutation, useQueries } from '@tanstack/react-query'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { useState } from 'react'
import { CollectionService } from '../services/collectionService'
import {
  downloadImageMutation,
  DownloadImageMutationParams,
  getPathsFromFavoriteIdsQueryOptions,
} from '../services/photoPathService'
import { parsePathName } from '../utils'
import {
  HiOutlineArrowLeft,
  HiOutlineArrowRight,
  HiOutlineDownload,
} from 'react-icons/hi'
import { PhotoCarousel } from '../components/admin/collection/PhotoCarousel'
import useWindowDimensions from '../hooks/windowDimensions'
import { PicturePath } from '../types'
import { Schema } from '../../amplify/data/resource'
import { V6Client } from '@aws-amplify/api-graphql'

interface FavoritesFullScreenParams {
  favorites: string[]
  path?: string
}

//TODO: revamp me with infinite query
export const Route = createFileRoute('/_auth/favorites-fullscreen')({
  component: RouteComponent,
  validateSearch: (
    search: Record<string, unknown>,
  ): FavoritesFullScreenParams => ({
    favorites: (search.favorites as string[]) || [],
    path: (search.path as string) ?? undefined,
  }),
  beforeLoad: ({ search }) => search,
  loader: async ({ context }) => {
    const client = context.client as V6Client<Schema>
    const collectionService = new CollectionService(client)
    const destination = `/${context.auth.admin ? 'admin' : 'client'}/dashboard`
    if (context.favorites.length === 0) throw redirect({ to: destination })

      
    const filteredFavorites = Array.from(new Set(context.favorites))
    const paths = await context.queryClient.ensureQueryData(
      getPathsFromFavoriteIdsQueryOptions(filteredFavorites),
    )

    const firstSubstring = paths[0].path.substring(
      paths[0].path.indexOf('/') + 1,
    )
    const collection = await context.queryClient.ensureQueryData(
      collectionService.getPhotoCollectionByIdQueryOptions(
        firstSubstring.substring(0, firstSubstring.indexOf('/'))
      )
    )

    let path = paths.find((queryPath) => queryPath.id === context.path)

    if (!path) {
      path = paths[0]
    }

    if(paths.length !== context.favorites.length || !collection) throw redirect({ to: destination })

    //TODO: improved visual for de-duplication
    return {
      CollectionService: collectionService,
      collection: collection,
      favorites: filteredFavorites,
      paths: paths.reduce((prev, cur) => {
        if(!prev.some((path) => parsePathName(path.path) === parsePathName(cur.path))) {
          prev.push(cur)
        }
        return prev
      }, [] as PicturePath[]),
      path: path,
      auth: context.auth,
    }
  },
})

function RouteComponent() {
  const data = Route.useLoaderData()
  const [current, setCurrent] = useState(data.paths[0])
  const navigate = Route.useNavigate()
  const dimensions = useWindowDimensions()

  console.log(new Set(data.favorites))

  const paths = useQueries({
    queries: data.paths.map((path) =>
      data.CollectionService.getPathQueryOptions(path.path ?? '', path.id),
    ),
  })


  const downloadImage = useMutation({
    mutationFn: (params: DownloadImageMutationParams) =>
      downloadImageMutation(params),
    onSettled: (file) => {
      if (file) {
        try {
          const url = window.URL.createObjectURL(file)
          const link = document.createElement('a')
          link.href = url
          link.download = file.name
          link.click()
          window.URL.revokeObjectURL(url)
        } catch (error) {
          console.error(error)
        }
      }
    },
  })

  return (
    <div
      className="bg-white flex flex-col items-center justify-center"
      style={{ height: dimensions.height }}
    >
      <div className="h-[50px] flex flex-row justify-between items-center px-4 text-gray-700 w-full border-b-gray-300 border-b-2">
        <button
          className="hover:border-gray-100 border border-transparent rounded-lg px-2 py-1 hover:bg-gray-200 hover:text-gray-500"
          onClick={() => {
            if (data.auth.admin) {
              navigate({ to: '/admin/dashboard/collection', search: { collection: data.collection.id, console: 'favorites' } })
            } else {
              navigate({ to: '/client/dashboard' })
            }
          }}
        >
          Back
        </button>
        <div>{parsePathName(current.path)}</div>
        <div className="flex flex-row gap-4">
          {(data.collection.downloadable || data.auth.admin) && (
            <button
              className={`${downloadImage.isPending ? 'cursor-wait' : ''}`}
              onClick={() => {
                if (!downloadImage.isPending) {
                  downloadImage.mutate({
                    path: current.path,
                    options: {
                      logging: true,
                    },
                  })
                }
              }}
            >
              <HiOutlineDownload size={24} />
            </button>
          )}
        </div>
      </div>
      <img
        src={paths.find((path) => path.data?.[0] === current.id)?.data?.[1]}
        style={{ height: dimensions.height - 200 }}
      />
      <PhotoCarousel
        paths={data.paths}
        data={paths}
        setSelectedPath={setCurrent}
        selectedPath={current}
        favorites={data.favorites}
      />
      <button
        className="fixed top-1/2 right-4 -translate-y-1/2 text-gray-700 rounded-lg p-4 z-50 hover:text-gray-500"
        onClick={() => {
          const currentIndex = data.paths.findIndex(
            (path) => path.id === current.id,
          )
          if(currentIndex == -1) {
            //TODO: handle the error
          }
          const nextIndex =
            currentIndex + 1 >= data.paths.length ? 0 : currentIndex + 1
          setCurrent(data.paths[nextIndex])
          navigate({
            to: '.',
            search: {
              favorites: data.favorites,
              path: data.paths[nextIndex].id,
            },
          })
        }}
      >
        <HiOutlineArrowRight size={32} />
      </button>
      <button
        className="fixed top-1/2 left-4 -translate-y-1/2 text-gray-700 rounded-lg p-4 z-50 hover:text-gray-500"
        onClick={() => {
          const currentIndex = data.paths.findIndex(
            (path) => path.id === current.id,
          )
          if(currentIndex == -1) {
            //TODO: handle the error
          }
          const nextIndex =
            currentIndex - 1 < 0 ? data.paths.length - 1 : currentIndex - 1
          setCurrent(data.paths[nextIndex])
          navigate({
            to: '.',
            search: {
              favorites: data.favorites,
              path: data.paths[nextIndex].id,
            },
          })
        }}
      >
        <HiOutlineArrowLeft size={32} />
      </button>
    </div>
  )
}
