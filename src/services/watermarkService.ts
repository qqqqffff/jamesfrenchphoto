import { getUrl, uploadData } from "aws-amplify/storage"
import { Watermark } from "../types"
import { v4 } from 'uuid'
import { generateClient } from "aws-amplify/api"
import { Schema } from "../../amplify/data/resource"

const client = generateClient<Schema>()

export interface WatermarkUploadParams {
  filesUpload: Map<string, File>
  progressStep: (progress: number) => void,
  options?: {
    logging?: boolean
  }
}
export async function uploadWatermarksMutation(params: WatermarkUploadParams): Promise<Watermark[]> {
  let watermarks: Watermark[] = []

  watermarks.push(...(await Promise.all(
    (await Promise.all(
      [...params.filesUpload.values()].map(async (file, index, arr) => {
        const result = await uploadData({
          path: `watermarks/${v4()}_${file.name}`,
          data: file,
          options: {
            onProgress: (event) => {
              params.progressStep((index + (event.transferredBytes / file.size)) / (arr.length - 1))
            }
          }
        }).result
        if(params.options?.logging) console.log(result)
        return result.path
      }))).map(async (path) => {
        const response = await client.models.Watermark.create({
          path: path,
        })
        if(params.options?.logging) console.log(response)
        return {
          url: (await getUrl({
            path: path,
          })).url.toString(),
          path: path,
        }
      })
  )).filter((path) => path !== undefined))

  return watermarks
}