import { createContext, ReactNode, useCallback, useContext, useState } from "react"
import { UserProfile, UserStorage } from "./types"
import { confirmSignIn, fetchAuthSession, fetchUserAttributes, FetchUserAttributesOutput, getCurrentUser, signIn, signOut } from "aws-amplify/auth"
import { Schema } from "../amplify/data/resource";
import { UserService } from "./services/userService";
import { V6Client } from '@aws-amplify/api-graphql'

type LoginReturnType = 'fail' | 'admin' | 'client' | 'nextStep'
export interface AuthContext {
    isAuthenticated: boolean,
    login: (username: string, password: string) => Promise<LoginReturnType>,
    confirmLogin: (username: string, password: string) => Promise<LoginReturnType>
    logout: () => Promise<void>,
    user: UserStorage | null,
    admin: boolean | null,
    changeParticipant: (participantId: string) => Promise<void | undefined>,
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

    const logout = useCallback(async () => {
        await signOut()
        setStoredUser(null)
        setUser(null)
    }, [])

    const userService = new UserService(client)

    const signinFlow = async (username: string) => {
        const user = await getCurrentUser()
        const session = await fetchAuthSession()
        const attributes = await fetchUserAttributes()
        const groups = JSON.stringify(session.tokens?.accessToken.payload['cognito:groups'])
        //TODO: validate that this is fetching entire profile correctly
        const profile = await userService.getUserProfileByEmail(client, username, 
            groups.includes('ADMINS') || groups.includes('USERS') ? {
                siTags: true,
                siTimeslot: true,
                siCollections: true,
                siNotifications: true,
            } : {}
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

    const login = useCallback(async (username: string, password: string) => {
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
    }, [])

    const confirmLogin = useCallback(async (username: string, password: string) => {
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
    }, [])

    const admin = user !== null ? user.groups.includes('ADMINS') : null

    const changeParticipant = useCallback(async (participantId: string) => {
        if(user){
            // console.log(user.profile)
            const foundParticipant = user.profile.participant.find((participant) => participant.id === participantId)
            if(foundParticipant === undefined) return
            const response = await client.models.UserProfile.update({
                email: user.profile.email,
                activeParticipant: participantId
            })
            if(response && response.data) {
                const tempProfile: UserProfile = {
                    ...user.profile,
                    activeParticipant: foundParticipant,
                }
                updateProfile(tempProfile)
            }
        }
    }, [])

    const updateProfile = useCallback((userProfile: UserProfile, attributes?: FetchUserAttributesOutput) => {
        if(user){
            const tempUser = {...user}
            tempUser.profile = userProfile
            tempUser.attributes = attributes ?? tempUser.attributes

            setStoredUser(tempUser)
            setUser(tempUser)
        }
    }, [])

    return (
        <AuthContext.Provider 
            value={{ 
                isAuthenticated, 
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