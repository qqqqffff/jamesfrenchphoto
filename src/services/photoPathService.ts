import { downloadData } from "aws-amplify/storage"
import { parsePathName } from "../utils"

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