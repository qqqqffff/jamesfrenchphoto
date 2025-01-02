import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from "react"
import { UserProfile, UserStorage } from "./types"
import { confirmSignIn, fetchAuthSession, fetchUserAttributes, getCurrentUser, signIn, signOut } from "aws-amplify/auth"
import { generateClient } from "aws-amplify/api";
import { Schema } from "../amplify/data/resource";
import { getUserProfileByEmail } from "./services/userService";

const client = generateClient<Schema>()

export interface AuthContext {
    isAuthenticated: boolean,
    login: (username: string, password: string) => Promise<boolean | 'nextStep'>,
    confirmLogin: (username: string, password: string) => Promise<boolean>
    logout: () => Promise<void>,
    user: UserStorage | null,
    admin: boolean | null,
    changeParticipant: (participantId: string) => Promise<void | undefined>
}

const AuthContext = createContext<AuthContext | null>(null)

const key = 'jfp.auth.user'

function getStoredUser() {
    const parsedLocalStorage = JSON.parse(localStorage.getItem(key) ?? '{}')
    return parsedLocalStorage === '{}' ? null : parsedLocalStorage as UserStorage
}

function setStoredUser(user: UserStorage | null){
    if(user){
        localStorage.setItem(key, JSON.stringify(user))
    }
    else {
        localStorage.removeItem(key)
    }
}

export function AuthProvider({ children } : { children: ReactNode }) {
    const [user, setUser] = useState<UserStorage | null>(getStoredUser())

    const isAuthenticated = !!user

    const logout = useCallback(async () => {
        await signOut()
        setStoredUser(null)
        setUser(null)
    }, [])

    const signinFlow = async (username: string) => {
        const user = await getCurrentUser()
        const session = await fetchAuthSession()
        const attributes = await fetchUserAttributes()
        const groups = JSON.stringify(session.tokens?.accessToken.payload['cognito:groups'])
        const profile = await getUserProfileByEmail(client, username)
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
    }

    const login = useCallback(async (username: string, password: string) => {
        try{
            const response = await signIn({
                username: username,
                password: password
            })
            if(response.nextStep.signInStep == 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED') return 'nextStep'
            else if(response.isSignedIn) {
                await signinFlow(username)
                return true
            }
            return false
        }catch(err){
            console.error(err)
            return false
        }
    }, [])

    const confirmLogin = useCallback(async (username: string, password: string) => {
        try{
            await confirmSignIn({
                challengeResponse: password
            })

            await signinFlow(username)
            return true
        } catch(err){
            console.error(err)
            return false
        }
    }, [])

    const admin = user ? (user.groups.includes('ADMINS') ? true : user.groups.includes('USERS')) : null

    const changeParticipant = useCallback(async (participantId: string) => {
        if(user){
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
                setUser({
                    ...user,
                    profile: tempProfile
                })
            }
        }
    }, [])

    useEffect(() => {
        setUser(getStoredUser())
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