import { createContext, ReactNode, useContext, useState } from "react"
import { UserProfile, UserStorage } from "./types"
import { confirmSignIn, fetchAuthSession, fetchUserAttributes, FetchUserAttributesOutput, getCurrentUser, signIn, signOut } from "aws-amplify/auth"
import { Schema } from "../amplify/data/resource";
import { UserService } from "./services/userService";
import { V6Client } from '@aws-amplify/api-graphql'

type LoginReturnType = 'fail' | 'admin' | 'client' | 'nextStep'
export interface AuthContext {
  isAuthenticated: boolean,
  validateAuth: () => Promise<boolean>
  login: (username: string, password: string) => Promise<LoginReturnType>,
  confirmLogin: (username: string, password: string) => Promise<LoginReturnType>
  logout: () => Promise<'success' | 'fail'>,
  user: UserStorage | null,
  admin: boolean,
  changeParticipant: (participantId: string) => Promise<'success' | 'fail'>,
  updateProfile: (userProfile: UserProfile, attributes?: FetchUserAttributesOutput) => void
}

const AuthContext = createContext<AuthContext | null>(null)

const key = 'jfp.auth.user'

function getStoredUser() {
    const parsedLocalStorage = JSON.parse(localStorage.getItem(key) ?? '{\"failed\": true}')
    return parsedLocalStorage?.failed ? null : parsedLocalStorage as UserStorage
}

function setStoredUser(user: UserStorage | null){
    if(user){
        localStorage.setItem(key, JSON.stringify(user))
    }
    else {
        localStorage.removeItem(key)
    }
}

export function AuthProvider({ children, client } : { children: ReactNode, client: V6Client<Schema> }) {
  const [user, setUser] = useState<UserStorage | null>(getStoredUser())

  const isAuthenticated = !!user

  const logout = async () => {
    try {
      await signOut()
      setStoredUser(null)
      setUser(null)
      return 'success'
    } catch (err) {
      console.error(err)
      return 'fail'
    }
  }

  const userService = new UserService(client)

  const signinFlow = async (username: string) => {
    const user = await getCurrentUser()
    const session = await fetchAuthSession()
    const attributes = await fetchUserAttributes()
    const groups = JSON.stringify(session.tokens?.accessToken.payload['cognito:groups'])
    const profile = await userService.getUserProfileByEmail(
      username, 
      {
        siTags: {
          siChildren: true,
          siPackages: true,
          siTimeslots: true,
        },
        siTimeslot: true,
        siCollections: true,
        siNotifications: true,
      }
    )
    if(!profile) throw new Error('Failed to query profile')
    const userStorage: UserStorage = {
      user,
      session,
      attributes,
      groups,
      profile,
    }
    setStoredUser(userStorage)
    setUser(userStorage)
    return groups.includes('ADMINS') ? 'admin' : groups.includes('USERS') ? 'client' : 'fail'
  }

  const login = async (username: string, password: string) => {
    try {
      const alreadyLoggedIn = await getCurrentUser()
      if(alreadyLoggedIn.signInDetails?.loginId !== undefined) {
        const response = await signinFlow(username.toLocaleLowerCase())
        return response
      }
    }catch(err) {
      console.error(err)
    }
    
    try{
      const response = await signIn({
        username: username.toLocaleLowerCase(),
        password: password
      })
      if(response.nextStep.signInStep == 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED') return 'nextStep'
      else if(response.isSignedIn) {
        const response = await signinFlow(username.toLocaleLowerCase())
        return response
      }
      return 'fail'
    }catch(err){
      console.error(err)
      return 'fail'
    }
  }

  const confirmLogin = async (username: string, password: string) => {
    try{
      await confirmSignIn({
        challengeResponse: password
      })

      const response = await signinFlow(username.toLocaleLowerCase())
      return response
    } catch(err){
      console.error(err)
      return 'fail'
    }
  }

  const admin = user !== null ? user.groups.includes('ADMINS') : false

  const changeParticipant = async (participantId: string) => {
    if(user){
      const foundParticipant = user.profile.participant.find((participant) => participant.id === participantId)
      if(foundParticipant === undefined) return 'fail'
      const response = await userService.updateActiveParticipant({
        profile: user.profile, 
        participantId: foundParticipant.id
      })
      if(response && response === 'success') {
        const tempProfile: UserProfile = {
          ...user.profile,
          activeParticipant: foundParticipant,
        }
        updateProfile(tempProfile)
      }
      return response === 'nochange' || response === 'success' ? 'success' : 'fail'
    }
    return 'fail'
  }

  const updateProfile = (userProfile: UserProfile, attributes?: FetchUserAttributesOutput) => {
      if(user){
        const tempUser = {...user}
        tempUser.profile = userProfile
        tempUser.attributes = attributes ?? tempUser.attributes

        setStoredUser(tempUser)
        setUser(tempUser)
      }
  }

  const validateAuth = async () => {
    try {
      const authSession = await fetchAuthSession()
      
      if(
        authSession.credentials?.expiration === undefined || 
        authSession.credentials.expiration.getTime() <= new Date().getTime() || 
        authSession.tokens === undefined
      ) {
        await logout()
        await new Promise(resolve => setTimeout(resolve, 1))
        return false
      }
      return true
    } catch(err) {
      console.error(err)
      return false
    }
  }

  return (
    <AuthContext.Provider 
      value={{ 
        isAuthenticated, 
        validateAuth,
        login, 
        confirmLogin, 
        logout, 
        user,
        admin,
        changeParticipant,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  
  if(!context) throw new Error('useAuth must be used within an AuthProvider')

  return context
}