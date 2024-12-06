import './App.css'
import SignIn from './components/authenticator/SignInForm'
import SignUp from './components/authenticator/SignUpForm'
import Header from './components/header/Header'
import { createBrowserRouter, createRoutesFromElements, Route, RouterProvider } from 'react-router-dom'
import ServiceForm from './components/service-form/ServiceForm'
import Home from './components/common/Home'
import CheckoutForm from './components/service-form/CheckoutForm'
// import { loadStripe } from '@stripe/stripe-js'
import { Amplify } from 'aws-amplify'
import outputs from '../amplify_outputs.json'
import { Dashboard as AdminDashboard } from './components/admin/Dashboard'
import { Dashboard as ClientDashboard } from './components/client/Dashboard'
import { Base } from './components/common/Base'
import ContactForm from './components/service-form/ContactForm'
import SignOut from './components/authenticator/SignOut'
import { generateClient } from 'aws-amplify/api'
import { Schema } from '../amplify/data/resource'
import { CollectionViewer } from './components/client/CollectionViewer'
import { Participant, PicturePath, UserProfile, UserStorage, UserTag } from './types'
import { getUrl } from 'aws-amplify/storage'
import { ClientProfile } from './components/client/Profile'

Amplify.configure(outputs)
const client = generateClient<Schema>()

const router = createBrowserRouter(
  createRoutesFromElements(
    <Route path='/' element={<Header />} loader={async () => {
      const userStorage: UserStorage | undefined = window.localStorage.getItem('user') !== null ? JSON.parse(window.localStorage.getItem('user')!) : undefined
      let userProfile: UserProfile | undefined
      if(userStorage){
        const getProfileResponse = await client.models.UserProfile.get({ email: userStorage.attributes.email! })
        if(getProfileResponse && getProfileResponse.data !== null){
          //TODO: safe delete -> api proof of concept retain only participant data
          // const timeslotResponse = await getProfileResponse.data.timeslot()
          // const timeslots: Timeslot[] | undefined = timeslotResponse ? timeslotResponse.data.map((timeslot) => {
          //       if(!timeslot.id) return
          //       return {
          //           id: timeslot.id as string,
          //           register: timeslot.register ?? undefined,
          //           start: new Date(timeslot.start),
          //           end: new Date(timeslot.end),
          //       }
          //   }).filter((timeslot) => timeslot !== undefined) : undefined
          
          const participantResponse = await getProfileResponse.data.participant()
          const participants: Participant[] = participantResponse ? (await Promise.all(participantResponse.data.map(async (participant) => {
            if(!participant.id) return
            const part: Participant = {
              ...participant,
              userTags: participant.userTags ? (await Promise.all((participant.userTags as string[]).map(async (tag) => {
                if(!tag) return
                const tagResponse = await client.models.UserTag.get({ id: tag })
                if(!tagResponse || !tagResponse.data || !tagResponse.data.id) return
                const userTag: UserTag = {
                  ...tagResponse.data,
                  color: tagResponse.data.color ?? undefined,
                }
                return userTag
              }))).filter((tag) => tag !== undefined) : [],
              middleName: participant.middleName ?? undefined,
              preferredName: participant.preferredName ?? undefined,
              email: participant.email ?? undefined,
              contact: participant.contact ?? false,
            }
            return part
          }))).filter((participant) => participant !== undefined) : []

          //try to create a participant from the details

          if(participants.length == 0 && getProfileResponse.data.participantFirstName && getProfileResponse.data.participantLastName){
            const createParticipantResponse = await client.models.Participant.create({
              firstName: getProfileResponse.data.participantFirstName,
              lastName: getProfileResponse.data.participantLastName,
              preferredName: getProfileResponse.data.participantPreferredName,
              middleName: getProfileResponse.data.participantMiddleName,
              email: getProfileResponse.data.participantEmail,
              contact: getProfileResponse.data.participantContact,
              userEmail: getProfileResponse.data.email,
              userTags: getProfileResponse.data.userTags ? getProfileResponse.data.userTags as string[] : []
            })
            console.log(createParticipantResponse)
            if(createParticipantResponse && createParticipantResponse.data && createParticipantResponse.data.id){
              participants.push({
                ...createParticipantResponse.data,
                userTags: getProfileResponse.data.userTags ? (await Promise.all((getProfileResponse.data.userTags as string[]).map(async (tag) => {
                  if(!tag) return
                  const tagResponse = await client.models.UserTag.get({ id: tag })
                  if(!tagResponse || !tagResponse.data || !tagResponse.data.id) return
                  const userTag: UserTag = {
                    ...tagResponse.data,
                    color: tagResponse.data.color ?? undefined,
                  }
                  return userTag
                }))).filter((tag) => tag !== undefined) : [],
                preferredName: getProfileResponse.data.participantPreferredName ?? undefined,
                middleName: getProfileResponse.data.participantMiddleName ?? undefined,
                email: getProfileResponse.data.participantEmail ?? undefined,
                contact: getProfileResponse.data.participantContact ?? false,
              })

              const updateProfile = await client.models.UserProfile.update({
                email: getProfileResponse.data.email,
                activeParticipant: createParticipantResponse.data.id
              })

              console.log(updateProfile)
            }
          }

          userProfile = {
            ...getProfileResponse.data,
            participant: participants,
            activeParticipant: getProfileResponse.data.activeParticipant ?? participants.length > 0 ? participants[0] : undefined,
            userTags: [],
            timeslot: [],
            participantFirstName: undefined,
            participantLastName: undefined,
            participantMiddleName: undefined,
            participantPreferredName: undefined,
            preferredContact: getProfileResponse.data.preferredContact ?? 'EMAIL',
            participantContact: undefined,
            participantEmail: undefined,
          }
        }
      }

      console.log(userProfile)
      return userProfile
    }}>
      <Route index element={<Home />} />
      <Route path='login' element={<SignIn />} />
      <Route path='register' element={<SignUp />} />
      <Route path='logout' element={<SignOut />} />
      <Route path='service-form' element={<ServiceForm />} />
      <Route path='service-form/checkout' element={<CheckoutForm />} />
      <Route path='admin' element={<Base />} >
        <Route path='dashboard' element={<AdminDashboard />} />
      </Route>
      <Route path='client' element={<Base />} action={async ({}) => {
        //todo: replace me with the logic inside of the base
      }}>
        <Route path='dashboard' element={<ClientDashboard />} loader={async ({}) => {
          //TODO: add fetching from amplify in here
          return null
        }}/>
        <Route path='profile/:email' element={<ClientProfile />} loader={async ({ params }) => {
          if(!params || !params.email) return null
          const response = (await client.models.UserProfile.get({ email: params.email })).data
          if(!response) return null

          const responseParticipants = (await response.participant()).data

          let participants: Participant[] = []
          
          if(responseParticipants.length <= 0 && response.participantFirstName && response.participantLastName){
            const createParticipantResponse = await client.models.Participant.create({
              firstName: response.participantFirstName,
              lastName: response.participantLastName,
              preferredName: response.participantPreferredName,
              middleName: response.participantMiddleName,
              email: response.participantEmail,
              contact: response.participantContact,
              userEmail: response.email,
              userTags: response.userTags ? response.userTags as string[] : []
            })
            console.log(createParticipantResponse)
            if(createParticipantResponse && createParticipantResponse.data && createParticipantResponse.data.id){
              participants.push({
                ...createParticipantResponse.data,
                userTags: createParticipantResponse.data.userTags ? (await Promise.all((createParticipantResponse.data.userTags as string[]).map(async (tag) => {
                  if(!tag) return
                  const tagResponse = await client.models.UserTag.get({ id: tag })
                  if(!tagResponse || !tagResponse.data || !tagResponse.data.id) return
                  const userTag: UserTag = {
                    ...tagResponse.data,
                    color: tagResponse.data.color ?? undefined,
                  }
                  return userTag
                }))).filter((tag) => tag !== undefined) : [],
                preferredName: response.participantPreferredName ?? undefined,
                middleName: response.participantMiddleName ?? undefined,
                email: response.participantEmail ?? undefined,
                contact: response.participantContact ?? false,
              })
            }
          }
          else if(responseParticipants.length > 0){
            participants = await Promise.all(responseParticipants.map(async (participant) => {
              const part: Participant = {
                ...participant,
                userTags: participant.userTags ? (await Promise.all((participant.userTags as string[]).map(async (tag) => {
                  if(!tag) return
                  const tagResponse = await client.models.UserTag.get({ id: tag })
                  if(!tagResponse || !tagResponse.data || !tagResponse.data.id) return
                  const userTag: UserTag = {
                    ...tagResponse.data,
                    color: tagResponse.data.color ?? undefined,
                  }
                  return userTag
                }))).filter((tag) => tag !== undefined) : [],
                middleName: participant.middleName ?? undefined,
                preferredName: participant.preferredName ?? undefined,
                email: participant.email ?? undefined,
                contact: participant.contact ?? false,
              }
              return part
            }))
          }

          const profile: UserProfile = {
            ...response,
            preferredContact: response.preferredContact ?? 'EMAIL',
            participant: participants,
            // not necessary for profile -> cleanup of old profile version
            timeslot: [],
            activeParticipant: undefined,
            participantFirstName: undefined,
            participantLastName: undefined,
            participantEmail: undefined,
            userTags: [],
            participantMiddleName: undefined,
            participantPreferredName: undefined,
            participantContact: false,
          }

          console.log(profile)
          return profile
        }} />
      </Route>
      <Route path='contact-form' element={<ContactForm />} />
      {/* <Route path='photo-collection' element={<PhotoCollectionComponent />} /> */}
      <Route path='photo-collection/:collectionId' element={<CollectionViewer />} loader={async ({ params }) => {
          console.log(params)
          if(!params.collectionId) return
          console.log('api call')
          return Promise.all((await client.models.PhotoPaths.listPhotoPathsByCollectionId({ collectionId: params.collectionId })).data.map(async (path) => {
            return {
              id: path.id,
              width: path.displayWidth,
              height: path.displayHeight,
              path: path.path,
              url: (await getUrl({
                path: path.path,
              })).url.toString()
            } as PicturePath
          }))
      }} />
    </Route>
  )
)

function App() {
  return (
    <>
      <RouterProvider router={router} />
    </>
  )
}

export default App
