import { APIMutationResponse } from "../../../../src/types";
import { Schema } from "../../../data/resource";

export const handler: Schema['ChargeShortNoticeCancelation']['functionHandler'] = async (event) => {
  let response: APIMutationResponse | undefined

  response = {
    status: "Success"
  }

  return response
}