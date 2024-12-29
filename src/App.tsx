import './App.css'
import SignIn from './components/authenticator/SignInForm'
import SignUp, { SignupAvailableTag } from './components/authenticator/SignUpForm'
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
import { CollectionViewer, DisplayCollectionData } from './components/client/CollectionViewer'
import { Package, Participant, PhotoCollection, PicturePath, Timeslot, UserProfile, UserStorage, UserTag } from './types'
import { getUrl } from 'aws-amplify/storage'
import { ClientProfile } from './components/client/Profile'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

Amplify.configure(outputs)
const client = generateClient<Schema>()

let createAccount = false

export async function createParticipantFromUserProfile(userProfile: UserProfile, timeslots: Timeslot[], setActiveParticipant?: boolean): Promise<Participant | void> {
  const createParticipantResponse = await client.models.Participant.create({
    firstName: userProfile.participantFirstName!,
    lastName: userProfile.participantLastName!,
    preferredName: userProfile.participantPreferredName,
    middleName: userProfile.participantMiddleName,
    email: userProfile.participantEmail,
    contact: userProfile.participantContact,
    userEmail: userProfile.email,
    userTags: userProfile.userTags ? userProfile.userTags as string[] : []
  })

  if(createParticipantResponse && createParticipantResponse.data && createParticipantResponse.data.id){
    const userTags: UserTag[] = userProfile.userTags ? (await Promise.all((userProfile.userTags as string[]).map(async (tag) => {
      if(!tag) return
      //tag validation
      const tagResponse = await client.models.UserTag.get({ id: tag })
      if(!tagResponse || !tagResponse.data || !tagResponse.data.id) return

      //collection
      const collectionTagResponse = await tagResponse.data.collectionTags()
      const collections: PhotoCollection[] = []
      if(collectionTagResponse && collectionTagResponse.data && collectionTagResponse.data.length > 0){
        collections.push(...(await Promise.all(collectionTagResponse.data.map(async (colTag) => {
          const photoCollection = await colTag.collection()
          if(!photoCollection || !photoCollection.data) return
          const paths = await photoCollection.data.imagePaths()
          const mappedPaths: PicturePath[] = (await Promise.all(paths.data.map(async (path) => {
            const mappedPath: PicturePath = {
              ...path,
              url: ''
            }
            return mappedPath
          })))
          const col: PhotoCollection = {
            ...photoCollection.data,
            coverPath: photoCollection.data.coverPath ?? undefined,
            paths: mappedPaths,
            tags: [],
            watermarkPath: photoCollection.data.watermarkPath ?? undefined,
            downloadable: photoCollection.data.downloadable ?? false,
          }
          return col
        }))).filter((collection) => collection !== undefined))
      }

      //all together
      const userTag: UserTag = {
        ...tagResponse.data,
        color: tagResponse.data.color ?? undefined,
        collections: collections
      }

      return userTag
    }))).filter((tag) => tag !== undefined) : []

    //participant
    const participant: Participant = {
      ...createParticipantResponse.data,
      timeslot: timeslots,
      userTags: userTags,
      preferredName: userProfile.participantPreferredName ?? undefined,
      middleName: userProfile.participantMiddleName ?? undefined,
      email: userProfile.participantEmail ?? undefined,
      contact: userProfile.participantContact ?? false,
    }

    if(setActiveParticipant){
      await client.models.UserProfile.update({
        email: userProfile.email,
        activeParticipant: createParticipantResponse.data.id
      })
    }
    return participant
  }
}

export async function fetchUserProfile(userStorage?: UserStorage): Promise<UserProfile | null> {
  if(userStorage){
    let timeslot: Timeslot[] = []
    const getProfileResponse = await client.models.UserProfile.get({ email: userStorage.attributes.email! })
    if(getProfileResponse && getProfileResponse.data !== null){
      const participantResponse = await getProfileResponse.data.participant()
      const participants: Participant[] = []
      
      //try to create a participant from the details
      
      if(participantResponse.data.length == 0 && getProfileResponse.data.participantFirstName && getProfileResponse.data.participantLastName && 
        !createAccount
      ){
        createAccount = true
        //timeslots
        const timeslotResponse = await getProfileResponse.data.timeslot()
        timeslot = timeslotResponse ? (await Promise.all(timeslotResponse.data.map(async (timeslot) => {
          if(!timeslot.id) return
          let tag: UserTag | undefined
          const tsTagResponse = await timeslot.timeslotTag()
          if(tsTagResponse && tsTagResponse.data) {
              const tagResponse = await tsTagResponse.data.tag()
              if(tagResponse && tagResponse.data){
                  tag = {
                      ...tagResponse.data,
                      color: tagResponse.data.color ?? undefined,
                  }
              }
          }
          const ts: Timeslot = {
            ...timeslot,
            id: timeslot.id,
            register: timeslot.register ?? undefined,
            tag: tag,
            start: new Date(timeslot.start),
            end: new Date(timeslot.end),
            participant: undefined,
          }
          return ts
        }))).filter((timeslot) => timeslot !== undefined) : []

        //create
        const createdParticipant = await createParticipantFromUserProfile({
          ...getProfileResponse.data,
          participantFirstName: getProfileResponse.data.participantFirstName,
          participantLastName: getProfileResponse.data.participantLastName,
          participantMiddleName: getProfileResponse.data.participantMiddleName ?? undefined,
          participantPreferredName: getProfileResponse.data.participantPreferredName ?? undefined,
          participantContact: getProfileResponse.data.participantContact ?? false,
          participantEmail: getProfileResponse.data.participantEmail ?? undefined,
          //unecessary fields
          participant: [],
          activeParticipant: undefined,
          userTags: getProfileResponse.data.userTags ? getProfileResponse.data.userTags as string[] : [],
          timeslot: [],
          preferredContact: getProfileResponse.data.preferredContact ?? 'EMAIL',
        }, timeslot, true)

        //on success
        if(createdParticipant) {
          participants.push(createdParticipant)
          //update timeslots
          await Promise.all(timeslot.map((timeslot) => {
            return client.models.Timeslot.update({
              id: timeslot.id,
              participantId: createdParticipant.id
            })
          }))
        }
      }
      else if(participantResponse.data.length > 0){
        const parts: Participant[] = participantResponse ? (await Promise.all(participantResponse.data.map(async (participant) => {
          if(!participant.id) return

          //tags
          const userTags: UserTag[] = participant.userTags ? (await Promise.all((participant.userTags as string[]).map(async (tag) => {
            if(!tag) return
            const tagResponse = await client.models.UserTag.get({ id: tag })
            if(!tagResponse || !tagResponse.data || !tagResponse.data.id) return

            //collection
            const collectionTagResponse = await tagResponse.data.collectionTags()
            const collections: PhotoCollection[] = []
            if(collectionTagResponse && collectionTagResponse.data && collectionTagResponse.data.length > 0){
              collections.push(...(await Promise.all(collectionTagResponse.data.map(async (colTag) => {
                const photoCollection = await colTag.collection()
                if(!photoCollection || !photoCollection.data) return
                const paths = await photoCollection.data.imagePaths()
                const mappedPaths: PicturePath[] = (await Promise.all(paths.data.map(async (path) => {
                  const mappedPath: PicturePath = {
                    ...path,
                    url: ''
                  }
                  return mappedPath
                })))
                const col: PhotoCollection = {
                  ...photoCollection.data,
                  coverPath: photoCollection.data.coverPath ?  (
                      (await getUrl({
                          path: photoCollection.data.coverPath
                      })).url.toString()
                  ) : undefined,
                  paths: mappedPaths,
                  tags: [],
                  watermarkPath: photoCollection.data.watermarkPath ?? undefined,
                  downloadable: photoCollection.data.downloadable ?? false,
                }
                return col
              }))).filter((collection) => collection !== undefined))
            }

            //packages
            const packageResponse = await tagResponse.data.packages()
            let userPackage: Package | undefined
            if(packageResponse && packageResponse.data){
              userPackage = {
                ...packageResponse.data,
                tag: {
                  ...tagResponse.data,
                  color: tagResponse.data.color ?? undefined,
                  collections: collections,
                }
              }
            }

            const userTag: UserTag = {
              ...tagResponse.data,
              color: tagResponse.data.color ?? undefined,
              collections: collections,
              package: userPackage,
            }

            return userTag
          }))).filter((tag) => tag !== undefined) : []

          //timeslots
          const timeslotResponse = await participant.timeslot()
          const timeslot: Timeslot[] = timeslotResponse ? (await Promise.all(timeslotResponse.data.map(async (timeslot) => {
            if(!timeslot.id) return
            const tagId = (await timeslot.timeslotTag()).data?.tagId

            const ts: Timeslot = {
              ...timeslot,
              id: timeslot.id,
              register: timeslot.register ?? undefined,
              tag: userTags.find((tag) => tag.id == tagId),
              start: new Date(timeslot.start),
              end: new Date(timeslot.end),
              participant: undefined
            }
            return ts
          }))).filter((timeslot) => timeslot !== undefined) : []

          //all together
          const part: Participant = {
            ...participant,
            timeslot: timeslot,
            userTags: userTags,
            middleName: participant.middleName ?? undefined,
            preferredName: participant.preferredName ?? undefined,
            email: participant.email ?? undefined,
            contact: participant.contact ?? false,
          }
          return part
        }))).filter((participant) => participant !== undefined) : []

        participants.push(...parts)
      }

      return {
        ...getProfileResponse.data,
        participant: participants,
        activeParticipant: participants.find((participant) => participant.id === getProfileResponse.data?.activeParticipant) ?? (participants.length > 0 ? participants[0] : undefined),
        userTags: getProfileResponse.data.userTags ? getProfileResponse.data.userTags as string[] : [],
        timeslot: timeslot,
        participantFirstName: getProfileResponse.data.participantFirstName ?? undefined,
        participantLastName: getProfileResponse.data.participantLastName ?? undefined,
        participantMiddleName: getProfileResponse.data.participantMiddleName ?? undefined,
        participantPreferredName: getProfileResponse.data.participantPreferredName ?? undefined,
        participantContact: getProfileResponse.data.participantContact ?? false,
        participantEmail: getProfileResponse.data.participantEmail ?? undefined,
        preferredContact: getProfileResponse.data.preferredContact ?? 'EMAIL',
      }
    }
  }
  return null
}

const router = createBrowserRouter(
  createRoutesFromElements(
    <Route path='/' element={<Header />} id='/' loader={async () => {
      let userStorage: UserStorage | undefined = window.localStorage.getItem('user') !== null ? JSON.parse(window.localStorage.getItem('user')!) : undefined
      try{
        return await fetchUserProfile(userStorage)
      }catch(err){
        return null
      }
    }} >
      <Route index element={<Home />} />
      <Route path='login' element={<SignIn />} />
      <Route path='register/:hash' element={<SignUp />} loader={async ({ params }): Promise<SignupAvailableTag[] | undefined> => {
          const tags: SignupAvailableTag[] = []
          if(!params.hash) return
          else {
            const tokenResponse = await client.models.TemporaryCreateUsersTokens.get(
              { id : params.hash },
              { authMode: 'iam' }
            )
            if(tokenResponse.data && tokenResponse.data.tags){
              tags.push(...(await Promise.all(tokenResponse.data.tags
                .filter((tag) => tag !== undefined && tag !== null)
                .map(async (tagId) => {
                  const tagResponse = await client.models.UserTag.get({ id: tagId }, { authMode: 'iam' })
                  if(!tagResponse || !tagResponse.data) return
                  const tag: SignupAvailableTag = {
                    tag: {
                      ...tagResponse.data,
                      color: tagResponse.data.color ?? undefined,
                    },
                    selected: {
                      selected: true,
                      participantId: '1'
                    }
                  }
                  return tag
                }))).filter((tag) => tag !== undefined))
            }
          }
          return tags
        }}/>
      <Route path='logout' element={<SignOut />} />
      <Route path='service-form' element={<ServiceForm />} />
      <Route path='service-form/checkout' element={<CheckoutForm />} />
      <Route path='admin' element={<Base />} >
        <Route path='dashboard' element={<AdminDashboard />} />
      </Route>
      <Route path='client' element={<Base />} >
        <Route path='dashboard' element={<ClientDashboard />} />
        <Route path='profile' element={<ClientProfile />} />
      </Route>
      <Route path='contact-form' element={<ContactForm />} />
      {/* <Route path='photo-collection' element={<PhotoCollectionComponent />} /> */}
      <Route path='photo-collection/:collectionId' element={<CollectionViewer />} 
      loader={async ({ params }) => {
          if(!params.collectionId) return
          const collection = (await client.models.PhotoCollection.get({ id: params.collectionId })).data
          if(!collection) return null
          const ret: DisplayCollectionData = {
            name: collection.name,
            createdAt: collection.createdAt,
            paths: await Promise.all((await client.models.PhotoPaths.listPhotoPathsByCollectionId({ collectionId: params.collectionId })).data.map(async (path) => {
              return {
                id: path.id,
                path: path.path,
                order: path.order,
                url: (await getUrl({
                  path: path.path,
                })).url.toString()
              } as PicturePath
            })),
            watermarkPath: collection.watermarkPath ? (await getUrl({
              path: collection.watermarkPath
            })).url.toString() : undefined,
            downloadable: collection.downloadable ?? false,
            coverPath: collection.coverPath ? (await getUrl({
              path: collection.coverPath
            })).url.toString() : undefined,
          }
          return ret
        }} 
      />
    </Route>
  )
)

function App() {
  const queryClient = new QueryClient()
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
}

export default App
