import { downloadData } from "aws-amplify/storage"
import { parsePathName } from "../utils"
import { DownloadData, Favorite, PicturePath } from "../types"
import { Dispatch, SetStateAction } from "react"
import JSZip from 'jszip';
import { Schema } from "../../amplify/data/resource";
import { V6Client } from '@aws-amplify/api-graphql'
import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";

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
  nextToken?: string,
  previous: boolean,
}
interface GetInfinitePathsOptions {
  maxItems?: number,
  unauthenticated?: boolean,
  participantId?: string,
  maxWindow?: number
}
async function getInfinitePaths(client: V6Client<Schema>, initial: GetInfinitePathsData, setId?: string, options?: GetInfinitePathsOptions): Promise<GetInfinitePathsData> {
  console.log('infinite api call')
  if(!setId) return initial;

  //TODO: conditional checking if the previous exists in the memo and fetch only if it doesnt
  const response = await client.models.PhotoPaths.listPhotoPathsBySetIdAndOrder( 
    { setId: setId },
    {
      sortDirection: 'ASC',
      limit: options?.maxItems ?? 12,
      nextToken: initial.nextToken,
      authMode: options?.unauthenticated ? 'identityPool' : 'userPool'
    }
  )

  console.log(response.data.map((data) => data))

  const newPaths: PicturePath[] = []

  //pushing new paths to the memo
  if(options?.participantId) {
    //adding favorites
    //TODO: replace with si by participant id and colleciton id
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

  const returnData: GetInfinitePathsData = {
    memo: newMemo,
    nextToken: response.nextToken ?? undefined,
    previous: false,
  }

  return returnData
}

export interface DownloadImageMutationParams {
  path: string,
  options?: {
    logging?: boolean
  }
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

export class PhotoPathService {
  private client: V6Client<Schema>
  constructor(client: V6Client<Schema>) {
    this.client = client
  }

  async downloadImageMutation(params: DownloadImageMutationParams){
    const downloadResponse = await downloadData({
      path: params.path
    }).result

    if(params.options?.logging) console.log(downloadResponse)

    const blob = await downloadResponse.body.blob()

    return new File([blob], parsePathName(params.path), { type: blob.type })
  }

  async downloadFavoritesMutation(params: DownloadFavoritesMutationOptions){
    const paths: string[] = (await Promise.all(params.favorites
      .map((favorite) => favorite.pathId)
      .map(async (pathId) => {
        const mappedPath = await this.client.models.PhotoPaths.get({ id: pathId })
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

  getPathsFromFavoriteIdsQueryOptions = (ids: string[], options?: GetPathsFromFavoriteIdsOptions) => queryOptions({
    queryKey: ['favorites', ids, options],
    queryFn: () => getPathsFromFavoriteIds(this.client, ids, options)
  })

  getInfinitePathsQueryOptions = (setId?: string, options?: GetInfinitePathsOptions) => infiniteQueryOptions({
    queryKey: ['infinitePhotoPaths', setId, options],
    queryFn: ({ pageParam }) => getInfinitePaths(this.client, pageParam, setId, options),
    getNextPageParam: (lastPage) => lastPage.nextToken ? lastPage : undefined,
    initialPageParam: ({
      memo: [] as PicturePath[],
    } as GetInfinitePathsData),
    refetchOnWindowFocus: false,
  })

  getAllPathsQueryOptions = (setId: string) => queryOptions({
    queryKey: ['allPhotoPaths', setId],
    queryFn: () => getAllPaths(this.client, setId)
  })
}