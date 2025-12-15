import { getAmplifyDataClientConfig } from "@aws-amplify/backend/function/runtime";
import { env } from '$amplify/env/register-timeslot'
import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/api";
import { Schema } from "../../data/resource";

const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(env)

Amplify.configure(resourceConfig, libraryOptions)

const dynamoClient = generateClient<Schema>()

export const handler: Schema['RegisterTimeslot']['functionHandler'] = async (event) => {
  if(
    !event.arguments.timeslotId || 
    !event.arguments.participantId ||
    // cannot register for a timeslot without user email
    (
      !event.arguments.userEmail && 
      !event.arguments.unregister
    )
  ) {
    return {
      status: 'Fail',
      error: 'Invalid Arguments'
    }
  }

  const getTimeslot = await dynamoClient.models.Timeslot.get({ id: event.arguments.timeslotId })
  if(getTimeslot.data === null) {
    return {
      status: 'Fail',
      error: 'Timeslot not found'
    }
  }
  if(event.arguments.unregister) {
    // ownership validation check
    if(
      event.arguments.participantId !== getTimeslot.data.participantId
    ) {
      return {
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
      return {
        status: 'Success',
        //could emit the response
      }
    }
    else if(response.errors) {
      return {
        status: 'Fail',
        graphqlErrors: response.errors
      }
    }
    else {
      return {
        status: 'Fail',
        error: 'Unknown exception'
      }
    }
  }
  else {
    //register validation
    if(
      getTimeslot.data.participantId !== null ||
      getTimeslot.data.register !== null
    ) {
      return {
        status: 'Fail',
        error: 'Timeslot has already been registered'
      }
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
      return {
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
      return {
        status: 'Fail',
        error: 'Participant does not have the tag correlated with this timeslot'
      }
    }
    const response = await dynamoClient.models.Timeslot.update({
      id: event.arguments.timeslotId,
      register: event.arguments.userEmail,
      participantId: event.arguments.participantId
    })
    if(response.data) {
      return {
        status: 'Success',
      }
    }
    else if(response.errors) {
      return {
        status: 'Fail',
        graphqlErrors: response.errors
      }
    }
    else {
      return {
        status: 'Fail',
        error: 'Unknown exception'
      }
    }
  }
}