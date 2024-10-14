import { fetchAuthSession, fetchUserAttributes, getCurrentUser } from "aws-amplify/auth"
import { useEffect } from "react"
import { Outlet, useNavigate } from "react-router-dom"
import { Amplify } from "aws-amplify";
import outputs from '../../../amplify_outputs.json'
import { Schema } from "../../../amplify/data/resource";
import { generateClient } from "aws-amplify/api";
import { UserStorage } from "../../types";

Amplify.configure(outputs)
const client = generateClient<Schema>()

export const Base = () => {
    const navigate = useNavigate()
    useEffect(() => {
        async function verifyUser(){
            let group = ''
            if(!window.localStorage.getItem('user')){
                const user = await getCurrentUser();
                const session = await fetchAuthSession();
                if(user && session && session.tokens && session.tokens?.accessToken){
                    const attributes = await fetchUserAttributes()
                    const groups = JSON.stringify(session.tokens?.accessToken.payload['cognito:groups'])
                    const profile = await client.models.UserProfile.get({email: user.userId}, {authToken: session.tokens?.accessToken.toString()})
                    window.localStorage.setItem('user', JSON.stringify({
                        user: user, 
                        session: session,
                        attributes: attributes, 
                        groups: groups, 
                        profile: profile
                    }))
                    window.dispatchEvent(new Event('storage'))
                    if(groups.includes('ADMINS')){
                        group = 'ADMIN'
                    }
                    else if(groups.includes('USERS')){
                        group = 'USERS'
                    }
                }
            }
            else{
                const userStorage: UserStorage = JSON.parse(window.localStorage.getItem('user')!)
                if(userStorage.groups.includes('ADMINS')){
                    group = 'ADMIN'
                }
                else if (userStorage.groups.includes('USERS')) {
                    group = 'USERS'
                }
            }

            if(group === 'ADMIN'){
                navigate('/admin/dashboard')
            }
            else if(group === 'USERS'){
                navigate('/client/dashboard')
            }
            
        }

        if(window.localStorage.getItem('user')){
            const tempUser: UserStorage = JSON.parse(window.localStorage.getItem('user')!)
            if(tempUser.groups.includes('ADMINS')){
                navigate('/admin/dashboard')
            }
            else if(tempUser.groups.includes('USERS')){
                navigate('/client/dashboard')
            }
            else{
                navigate('/login', {
                    state: {
                        unauthorized: true
                    }
                })
            }
        }
        verifyUser()
    }, [])
    return (
        <>
            <Outlet />
        </>
    )
}
