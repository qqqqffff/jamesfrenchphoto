import { getAmplifyDataClientConfig } from "@aws-amplify/backend/function/runtime";
import { env } from '$amplify/env/register-timeslot'
import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/api";
import { Schema } from "../../../data/resource";
import { APIMutationResponse } from "../../../../src/types";

const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(env)

Amplify.configure(resourceConfig, libraryOptions)

const dynamoClient = generateClient<Schema>()

export const handler: Schema['RegisterTimeslot']['functionHandler'] = async (event) => {
  let returnObject: APIMutationResponse | undefined = undefined
  if(
    !event.arguments.timeslotId || 
    !event.arguments.participantId ||
    // cannot register for a timeslot without user email
    (
      !event.arguments.userEmail && 
      !event.arguments.unregister
    )
  ) {
    returnObject = {
      status: 'Fail',
      error: 'Invalid Arguments'
    }
    return returnObject
  }

  const getTimeslot = await dynamoClient.models.Timeslot.get({ id: event.arguments.timeslotId })
  if(getTimeslot.data === null) {
    returnObject = {
      status: 'Fail',
      error: 'Timeslot not found'
    }
    return returnObject
  }
  if(event.arguments.unregister) {
    // ownership validation check
    if(
      event.arguments.participantId !== getTimeslot.data.participantId
    ) {
      returnObject = {
        status: 'Fail',
        error: 'Cannot unregister from a timeslot that is not yours'
      }
    }
    // validations passed
    const response = await dynamoClient.models.Timeslot.update({
      id: event.arguments.timeslotId,
      register: null,
      participantId: null,
    })
    if(response.data) {
      returnObject = {
        status: 'Success',
      }
      return returnObject
    }
    else if(response.errors) {
      returnObject = {
        status: 'Fail',
        error: response.errors.map((error) => error.message).join(', ')
      }
      return returnObject
    }
    else {
      returnObject = {
        status: 'Fail',
        error: 'Unknown exception'
      }
      return returnObject
    }
  }
  else {
    //register validation
    if(
      getTimeslot.data.participantId !== null ||
      getTimeslot.data.register !== null
    ) {
      returnObject = {
        status: 'Fail',
        error: 'Timeslot has already been registered'
      }
      return returnObject
    }

    // tag validation check
    const getTag = await getTimeslot.data.timeslotTag()
    const getParticipant = await dynamoClient.models.Participant.get({ id: event.arguments.participantId })
    if(getParticipant.data == null || getTag.data === null) {
      return {
        status: 'Fail',
        error: 'Unable to register for a timeslot without a tag.'
      }
    }
    if(getParticipant.data === null) {
      returnObject = {
        status: 'Fail',
        error: 'Participant does not exist.'
      }
    }

    let getParticipantTags = await getParticipant.data.tags()
    const participantTagsData = getParticipantTags.data

    while(getParticipantTags.nextToken) {
      getParticipantTags = await getParticipant.data.tags({ nextToken: getParticipantTags.nextToken })
      participantTagsData.push(...getParticipantTags.data)
    }

    if(
      !participantTagsData.some((tag) => tag.tagId === getTag.data?.tagId) ||
      !getTag.data.tagId
    ) {
      returnObject = {
        status: 'Fail',
        error: 'Participant does not have the tag correlated with this timeslot'
      }
      return returnObject
    }
    const response = await dynamoClient.models.Timeslot.update({
      id: event.arguments.timeslotId,
      register: event.arguments.userEmail,
      participantId: event.arguments.participantId
    })
    if(response.data) {
      returnObject = {
        status: 'Success',
      }
      return returnObject
    }
    else if(response.errors) {
      returnObject = {
        status: 'Fail',
        error: response.errors.map((error) => error.message).join(', ')
      }
      return returnObject
    }
    else {
      returnObject = {
        status: 'Fail',
        error: 'Unknown exception'
      }
      return returnObject
    }
  }
}