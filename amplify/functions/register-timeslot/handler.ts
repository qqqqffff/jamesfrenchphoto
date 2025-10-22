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
    return JSON.stringify({
      status: 'Fail',
      error: 'Invalid Arguments'
    })
  }

  const getTimeslot = await dynamoClient.models.Timeslot.get({ id: event.arguments.timeslotId })
  if(getTimeslot.data === null) {
    return JSON.stringify({
      status: 'Fail',
      error: 'Timeslot not found'
    })
  }
  if(event.arguments.unregister) {
    // ownership validation check
    if(
      event.arguments.participantId !== getTimeslot.data.participantId
    ) {
      return JSON.stringify({
        status: 'Fail',
        error: 'Cannot unregister from a timeslot that is not yours'
      })
    }
    // validations passed
    const response = await dynamoClient.models.Timeslot.update({
      id: event.arguments.timeslotId,
      register: null,
      participantId: null,
    })
    if(response.data) {
      return JSON.stringify({
        status: 'Success',
        //could emit the response
      })
    }
    else if(response.errors) {
      return JSON.stringify({
        status: 'Fail',
        graphqlErrors: response.errors
      })
    }
    else {
      return JSON.stringify({
        status: 'Fail',
        error: 'Unknown exception'
      })
    }
  }
  else {
    //register validation
    if(
      getTimeslot.data.participantId ||
      getTimeslot.data.register !== event.arguments.userEmail
    ) {
      return JSON.stringify({
        status: 'Fail',
        error: 'Timeslot has already been registered'
      })
    }

    // tag validation check
    const getTag = await getTimeslot.data.timeslotTag()
    const getParticipant = await dynamoClient.models.Participant.get({ id: event.arguments.participantId })
    if(getParticipant.data == null || getTag.data === null) {
      return JSON.stringify({
        status: 'Fail',
        error: 'Timeslot tag or participant does not exist'
      })
    }
    const getParticipantTags = await getParticipant.data.tags()
    if(
      !getParticipantTags.data.some((tag) => tag.tagId === getTag.data?.tagId) ||
      !getTag.data.tagId
    ) {
      return JSON.stringify({
        status: 'Fail',
        error: 'Participant does not have the tag correlated with this timeslot'
      })
    }
    const response = await dynamoClient.models.Timeslot.update({
      id: event.arguments.timeslotId,
      register: event.arguments.userEmail,
      participantId: event.arguments.participantId
    })
    if(response.data) {
      return JSON.stringify({
        status: 'Success',
        //could emit the response
      })
    }
    else if(response.errors) {
      return JSON.stringify({
        status: 'Fail',
        graphqlErrors: response.errors
      })
    }
    else {
      return JSON.stringify({
        status: 'Fail',
        error: 'Unknown exception'
      })
    }
  }
}