import { getAmplifyDataClientConfig } from "@aws-amplify/backend/function/runtime";
import { Schema } from "../../data/resource";
import { Participant, UserProfile } from "../../../src/types";
import { env } from '$amplify/env/register-user'
import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/api";

const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(env)
Amplify.configure(resourceConfig, libraryOptions)

const client = generateClient<Schema>()

export const handler: Schema['RegisterUser']['functionHandler'] = async (event) => {
  const userProfile: UserProfile | null = JSON.parse(event.arguments.userProfile)
  if(!userProfile) return 'Malformed user'
  const token = event.arguments.token

  const returnObject: {
    readUser: UserProfile,
    readToken?: string,
    deleteResponse?: Schema['TemporaryCreateUsersTokens']['type'] | null
    deleteUserResponse?: Schema['UserProfile']['type'] | null
    userResponse?: Schema['UserProfile']['type'] | null
    participantResponses?: [
      Schema['Participant']['type'] | null, 
      'create' | 'update' | 'delete'
    ][]
  } = { 
    readUser: userProfile,
    readToken: token ?? undefined
  }

  //if token exists that means profile, participants and tagging already exist -> 
  // just need to delete token and validate changes for participants/create new
  if(token) {
    const deleteResponse = await client.models.TemporaryCreateUsersTokens.delete({
      id: token
    })
    console.log(deleteResponse)
    returnObject.deleteResponse = deleteResponse.data

    //soft check if the email was changed
    const profileResponse = await client.models.UserProfile.get({ email: userProfile.email.toLocaleLowerCase() })
    console.log(profileResponse)
    //if null need to create and delete old profile
    if(!profileResponse.data) {
      const oldProfileResponse = (await deleteResponse.data?.userProfile())?.data ?? null

      //cleaning up old profile if exists
      if(oldProfileResponse) {
        const deleteProfileResponse = await client.models.UserProfile.delete({ email: oldProfileResponse.email })
        console.log(deleteProfileResponse)
        returnObject.deleteUserResponse = deleteProfileResponse.data
      }

      const createProfileResponse = await client.models.UserProfile.create({
        email: userProfile.email.toLocaleLowerCase(),
        firstName: userProfile.firstName,
        lastName: userProfile.lastName,
        preferredContact: userProfile.preferredContact,
      })
      console.log(createProfileResponse)
      returnObject.userResponse = createProfileResponse.data
      //need to recreate participants if they exist

      const updatedParticipants: string[] = (await Promise.all(((await oldProfileResponse?.participant())?.data ?? [])
        .map(async (participant) => {
          //could have deleted the participant ->
          // cannot delete a participant with tags
          const foundParticipant = userProfile.participant.find((pParticipant) => pParticipant.id === participant.id)
          if(!foundParticipant) {
            const response = await client.models.Participant.delete({ id: participant.id })
            console.log(response)
            returnObject.participantResponses = [
              ...(returnObject.participantResponses ?? []), 
              [response.data, 'delete']
            ]
          }
          //on update -> 
          // tags should not need to be updated since they cannot be transfered or deleted
          else {
            const response = await client.models.Participant.update({
              ...foundParticipant,
              userEmail: userProfile.email,
            })
            console.log(response)

            returnObject.participantResponses = [
              ...(returnObject.participantResponses ?? []),
              [response.data, 'update']
            ]

            return response.data?.id
          }
        })
      )).filter((participantId) => participantId !== undefined)

      //newly created participants
      await Promise.all(userProfile.participant
        .filter((participant) => (
          !updatedParticipants.some((uParticipant) => uParticipant !== participant.id)
        ))
        .map(async (participant) => {
          //impossible to create a participant with tags
          const createResponse = await client.models.Participant.create({
            ...participant,
            userEmail: userProfile.email.toLocaleLowerCase()
          })
          console.log(createResponse)
          returnObject.participantResponses = [
            ...(returnObject.participantResponses ?? []), [
              createResponse.data,
              'create'
            ]
          ]
        })
      )
    }
    //else soft comparison check
    else if(
      profileResponse.data.firstName !== userProfile.firstName ||
      profileResponse.data.lastName !== userProfile.lastName ||
      profileResponse.data.preferredContact !== userProfile.preferredContact
    ){
      const updateProfileResponse = await client.models.UserProfile.update({
        email: userProfile.email.toLocaleLowerCase(),
        firstName: userProfile.firstName,
        lastName: userProfile.lastName,
        preferredContact: userProfile.preferredContact,
      })
      returnObject.userResponse = updateProfileResponse.data

      const participantsResponse = (await profileResponse.data.participant()).data

      await Promise.all(userProfile.participant.map(async (participant) => {
        const found = participantsResponse.find((rParticipant) => participant.id === rParticipant.id)
        //soft comparison check
        if(
          found &&
          (
            found.firstName !== participant.firstName ||
            found.lastName !== participant.lastName ||
            found.middleName !== participant.middleName ||
            found.preferredName !== participant.preferredName ||
            found.email !== participant.email ||
            found.contact !== participant.contact
          )
        ) {
          const response = await client.models.Participant.update({
            id: participant.id,
            firstName: participant.firstName,
            lastName: participant.lastName,
            middleName: participant.middleName ?? null,
            preferredName: participant.preferredName ?? null,
            email: participant.email ?? null,
          })

          returnObject.participantResponses = [
            ...(returnObject.participantResponses ?? []), [
              response.data,
              'update'
            ]
          ]
        } else {
          const response = await client.models.Participant.create({
            id: participant.id,
            firstName: participant.firstName,
            lastName: participant.lastName,
            middleName: participant.middleName,
            preferredName: participant.preferredName,
            email: participant.email,
            userEmail: userProfile.email.toLocaleLowerCase()
          })

          returnObject.participantResponses = [
            ...(returnObject.participantResponses ?? []), [
              response.data,
              'create'
            ]
          ]
        }
      }))
    }
  }
  else {
    //no token means no pre-existing profile
    const createProfileResponse = await client.models.UserProfile.create({
      email: userProfile.email.toLocaleLowerCase(),
      firstName: userProfile.firstName,
      lastName: userProfile.lastName,
      preferredContact: userProfile.preferredContact,
    })
    returnObject.userResponse = createProfileResponse.data

    await Promise.all(userProfile.participant
      .map(async (participant) => {
        //impossible to create a participant with tags
        const createResponse = await client.models.Participant.create({
          ...participant,
          userEmail: userProfile.email.toLocaleLowerCase()
        })
        returnObject.participantResponses = [
          ...(returnObject.participantResponses ?? []), [
            createResponse.data,
            'create'
          ]
        ]
      })
    )
  }

  return JSON.stringify(returnObject)
}