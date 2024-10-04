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
import { PicturePath } from './types'
import { getUrl } from 'aws-amplify/storage'

Amplify.configure(outputs)
const client = generateClient<Schema>()
// const stripePromise = loadStripe('pk_test_51LFMxh4ILV990wpfvwN6CptxsdmG6X3mChYd7sx2JzLnLVfirqA9Ns5vKMi9c8rX6xrYV6HKT6ZiWBavtN7KvZ9100lZNFdI32')

const router = createBrowserRouter(
  createRoutesFromElements(
    <Route path='/' element={<Header />} >
      <Route index element={<Home />} />
      <Route path='login' element={<SignIn />} />
      <Route path='register' element={<SignUp />} />
      <Route path='service-form' element={<ServiceForm />} />
      <Route path='service-form/checkout' element={<CheckoutForm />} />
      <Route path='admin' element={<Base />} >
        <Route path='dashboard' element={<AdminDashboard />} />
      </Route>
      <Route path='client' element={<Base />} action={async ({}) => {
        //todo: replace me with the logic inside of the base
      }}>
        <Route path='dashboard' element={<ClientDashboard />} loader={async ({}) => {
          //todo: add fetching from amplify in here
          return null
        }}/>
        
      </Route>
      <Route path='contact-form' element={<ContactForm />} />
      <Route path='logout' element={<SignOut />} />
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
