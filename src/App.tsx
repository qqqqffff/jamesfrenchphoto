import './App.css'
import { SignIn, SignUp } from './components/authenticator/Authenticator'
import Header from './components/header/Header'
import { createBrowserRouter, createRoutesFromElements, Route, RouterProvider } from 'react-router-dom'
import ServiceForm from './components/service-form/ServiceForm'
import Home from './components/home/Home'
import CheckoutForm from './components/service-form/CheckoutForm'
import { loadStripe } from '@stripe/stripe-js'
import { Amplify } from 'aws-amplify'
import outputs from '../amplify_outputs.json'

Amplify.configure(outputs)
const stripePromise = loadStripe('pk_test_51LFMxh4ILV990wpfvwN6CptxsdmG6X3mChYd7sx2JzLnLVfirqA9Ns5vKMi9c8rX6xrYV6HKT6ZiWBavtN7KvZ9100lZNFdI32')

const router = createBrowserRouter(
  createRoutesFromElements(
    <Route path='/' element={<Header />} >
      <Route index element={<Home />} />
      <Route path='login' element={<SignIn />} />
      <Route path='register' element={<SignUp />} />
      <Route path='service-form' element={<ServiceForm />} />
      <Route path='service-form/checkout' element={<CheckoutForm />} />
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
