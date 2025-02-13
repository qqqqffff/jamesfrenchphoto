import { downloadData } from "aws-amplify/storage"
import { parsePathName } from "../utils"
import { Favorite, PicturePath } from "../types"
import { Dispatch, SetStateAction } from "react"
import JSZip from 'jszip';
import { generateClient } from "aws-amplify/api";
import { Schema } from "../../amplify/data/resource";
import { DownloadData } from "../components/common/DownloadToast";
import { V6Client } from '@aws-amplify/api-graphql'
import { queryOptions } from "@tanstack/react-query";

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