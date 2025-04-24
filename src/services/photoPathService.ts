import { downloadData } from "aws-amplify/storage"
import { parsePathName } from "../utils"
import { DownloadData, Favorite, PicturePath } from "../types"
import { Dispatch, SetStateAction } from "react"
import JSZip from 'jszip';
import { generateClient } from "aws-amplify/api";
import { Schema } from "../../amplify/data/resource";
import { V6Client } from '@aws-amplify/api-graphql'
import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";

const client = generateClient<Schema>()

interface GetPathsFromFavoriteIdsOptions {
  logging?: boolean,
  metric?: boolean
}
async function getPathsFromFavoriteIds(client: V6Client<Schema>, ids: string[], options?: GetPathsFromFavoriteIdsOptions): Promise<PicturePath[]> {
  const paths: PicturePath[] = (await Promise.all(ids.map(async (id) => {
    const favoriteResponse = await client.models.UserFavorites.get({ id: id })
    if(options?.logging) console.log(favoriteResponse)
    if(favoriteResponse.data){
      const path = await favoriteResponse.data.path()
      if(options?.logging) console.log(path)
      if(path.data) {
        const mappedPath: PicturePath = {
          ...path.data,
          url: ''
        }
        return mappedPath
      }
    }
    return
  }))).filter((path) => path !== undefined)

  return paths
}

export async function getAllPaths(client: V6Client<Schema>, setId: string): Promise<PicturePath[]> {
  let response = await client.models.PhotoPaths.listPhotoPathsBySetIdAndOrder({ setId: setId })
  const data = response.data

  while(response.nextToken) {
    response = await client.models.PhotoPaths.listPhotoPathsBySetIdAndOrder({ setId: setId }, { nextToken: response.nextToken })
    data.push(...response.data)
  }

  const mappedPaths: PicturePath[] = data.map((path) => {
    const mappedPath: PicturePath = {
      ...path,
      url: ''
    }
    return mappedPath
  })

  return mappedPaths
}

export interface GetInfinitePathsData {
  memo: PicturePath[],
  returnSet: PicturePath[],
  nextToken?: string,
  offset: number,
  previous: boolean,
}
interface GetInfinitePathsOptions {
  maxItems?: number,
  unauthenticated?: boolean,
  participantId?: string,
  maxWindow?: number
}
async function getInfinitePaths(client: V6Client<Schema>, initial: GetInfinitePathsData, setId?: string, options?: GetInfinitePathsOptions): Promise<GetInfinitePathsData> {
  if(!setId) return initial;

  const response = await client.models.PhotoPaths.listPhotoPathsBySetIdAndOrder(
    { setId: setId }, 
    {
      sortDirection: 'ASC',
      limit: options?.maxItems ?? 12,
      nextToken: initial.nextToken,
      authMode: options?.unauthenticated ? 'identityPool' : 'userPool'
    }
  )

  const newPaths: PicturePath[] = []

  //pushing new paths to the memo
  if(options?.participantId) {
    //TODO: improve me
    newPaths.push(...(await Promise.all(response.data
      .filter((path) => !initial.memo.some((pPath) => pPath.id === path.id))
      .map(async (path) => {
        let favorite: undefined | string = (await path.favorites({ 
              authMode: options?.unauthenticated ? 'identityPool' : 'userPool' 
            })).data.find((favorite) => favorite.participantId === options.participantId)?.id
        
        const mappedPath: PicturePath = {
            ...path,
            url: '',
            favorite: favorite,
        }
        return mappedPath
    }))))
  }
  else {
    newPaths.push(...response.data
      .filter((path) => !initial.memo.some((pPath) => pPath.id === path.id))
      .map((path) => {
        const mappedPath: PicturePath = {
          ...path,
          url: ''
        }
        return mappedPath
      })
    )
  }

  const newMemo: PicturePath[] = [...initial.memo, ...newPaths]
  let newReturnSet: PicturePath[] = newMemo
  let newOffset = initial.offset

  if(initial.previous) {
    newOffset = newOffset < 0 ? 0 : newOffset
    newReturnSet = newReturnSet.filter((path) => {
      return path.order >= newOffset && path.order < newOffset + (options?.maxWindow ?? 60) 
    })
    newOffset -= options?.maxItems ?? 12
  }
  else {
    newReturnSet = newReturnSet.filter((path) => {
      return path.order >= newOffset && path.order < newOffset + (options?.maxWindow ?? 60)
    })
    newOffset = newReturnSet.length + (options?.maxItems ?? 12) > (options?.maxWindow ?? 60) ? 
      newOffset + (options?.maxItems ?? 12) : newOffset
  }

  const returnData: GetInfinitePathsData = {
    memo: newMemo,
    returnSet: newReturnSet,
    nextToken: response.nextToken ?? undefined,
    previous: false,
    offset: newOffset,
  }

  return returnData
}

export interface DownloadImageMutationParams {
  path: string,
  options?: {
    logging?: boolean
  }
}

export async function downloadImageMutation(params: DownloadImageMutationParams){
  const downloadResponse = await downloadData({
    path: params.path
  }).result

  if(params.options?.logging) console.log(downloadResponse)

  const blob = await downloadResponse.body.blob()

  return new File([blob], parsePathName(params.path), { type: blob.type })
}

export interface DownloadFavoritesMutationOptions {
  downloadId: string,
  zipName: string,
  favorites: Favorite[],
  updateProgress: Dispatch<SetStateAction<DownloadData[]>>,
  options?: {
    logging?: boolean
  }
}
export async function downloadFavoritesMutation(params: DownloadFavoritesMutationOptions){
  const paths: string[] = (await Promise.all(params.favorites
    .map((favorite) => favorite.pathId)
    .map(async (pathId) => {
      const mappedPath = await client.models.PhotoPaths.get({ id: pathId })
      if(!mappedPath.data) return
      return mappedPath.data.path
  }))).filter((path) => path !== undefined)

  const zip = new JSZip()

  for(const path of paths){
    const file = await downloadData({
      path: path
    }).result

    if(file){
      zip.file(parsePathName(path), new File([await file.body.blob()], parsePathName(path), { type: file.contentType }))
    }

    params.updateProgress((prev) => {
      const temp = [...prev].map((download) => {
        if(download.id === params.downloadId){
          return {
            ...download,
            progress: download.progress + 1
          }
        }
        return download
      })
      return temp
    })
  }

  params.updateProgress((prev) => {
    const temp = [...prev].map((download) => {
      if(download.id === params.downloadId){
        return {
          ...download,
          state: 'done' as 'done'
        }
      }
      return download
    })
    return temp
  })

  const zipContent = zip.generateAsync({ type: 'blob' })
  console.log(zipContent)

  return new File([await zipContent], params.zipName, { type: 'application/zip' }) 
}

export const getPathsFromFavoriteIdsQueryOptions = (ids: string[], options?: GetPathsFromFavoriteIdsOptions) => queryOptions({
  queryKey: ['favorites', client, ids, options],
  queryFn: () => getPathsFromFavoriteIds(client, ids, options)
})

export const getInfinitePathsQueryOptions = (setId?: string, options?: GetInfinitePathsOptions) => infiniteQueryOptions({
  queryKey: ['infinitePhotoPaths', client, setId, options],
  queryFn: ({ pageParam }) => getInfinitePaths(client, pageParam, setId, options),
  getNextPageParam: (lastPage) => lastPage.nextToken ? lastPage : undefined,
  initialPageParam: ({
    memo: [] as PicturePath[],
    returnSet: [] as PicturePath[],
    offset: 0,
  } as GetInfinitePathsData),
  //offset is the minimum order - maximumOrder = currentWindow
  getPreviousPageParam: (page) => 
    page.returnSet.length > 0 &&
    page.offset - page.returnSet[page.returnSet.length - 1].order > 0 ? 
    { ...page, previous: true } : undefined, 
  refetchOnWindowFocus: false,
})