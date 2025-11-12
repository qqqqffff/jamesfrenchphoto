import { remove, uploadData } from "aws-amplify/storage"
import { PhotoCollection, Watermark } from "../types"
import { v4 } from 'uuid'
import { Schema } from "../../amplify/data/resource"
import { Dispatch, SetStateAction } from "react"
import { V6Client } from '@aws-amplify/api-graphql'

export interface WatermarkUploadParams {
  filesUpload: Map<string, File>,
  updateWatermarks: Dispatch<SetStateAction<Watermark[]>>,
  options?: {
    logging?: boolean
  }
}

export interface DeleteWatermarkParams {
  watermark: Watermark,
  options?: {
    logging?: boolean
  }
}

export interface ApplyWatermarkParams {
  collection: PhotoCollection
  collectionWatermark: string | undefined
  setWatermarks: Record<string, string | undefined>
  options?: {
    logging?: boolean
  }
}

export class WatermarkService {
  private client: V6Client<Schema>
  constructor(client: V6Client<Schema>) {
    this.client = client
  }

  async uploadWatermarksMutation(params: WatermarkUploadParams): Promise<Watermark[]> {
    let watermarks: Watermark[] = []

    watermarks.push(...(await Promise.all(
      [...params.filesUpload.values()].map(async (file) => {
        const result = await uploadData({
          path: `watermarks/${v4()}_${file.name}`,
          data: file,
        }).result
        if(params.options?.logging) console.log(result)

        const response = await this.client.models.Watermark.create({
          path: result.path,
        })
        if(params.options?.logging) console.log(response)

        params.updateWatermarks((prev) => {
          if(response.data){
            return [
              ...prev, {
                id: response.data.id,
                url: '',
                path: result.path,
              }
            ]
          }
          return prev
        })

        if(response.data) {
          return {
            id: response.data.id,
            url: '',
            path: result.path,
          }
        }
      })
    )).filter((path) => path !== undefined))

    return watermarks
  }

  async deleteWatermarkMutation(params: DeleteWatermarkParams) {
    const response = await this.client.models.Watermark.delete({ id: params.watermark.id })
    if(params.options?.logging) console.log(response)

    const s3response = await remove({
      path: params.watermark.path
    })
    if(params.options?.logging) console.log(s3response)
  }

  async applyWatermarkMutation(params: ApplyWatermarkParams){
    if(params.collection.watermarkPath !== params.collectionWatermark){
      const response = await this.client.models.PhotoCollection.update({
        id: params.collection.id,
        watermarkPath: params.collectionWatermark ?? null
      })
      if(params.options?.logging) console.log(response)
    }
    const response = await Promise.all(params.collection.sets.map((set) => {
      if(params.setWatermarks[set.id] !== set.watermarkPath) {
        return this.client.models.PhotoSet.update({
          id: set.id,
          watermarkPath: params.setWatermarks[set.id] ?? null
        })
      }
    }))
    if(params.options?.logging) console.log(response)
  }
}