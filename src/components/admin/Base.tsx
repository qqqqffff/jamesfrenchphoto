import { fetchAuthSession, fetchUserAttributes, getCurrentUser } from "aws-amplify/auth"
import { useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Amplify } from "aws-amplify";
import outputs from '../../../amplify_outputs.json'
import { Schema } from "../../../amplify/data/resource";
import { generateClient } from "aws-amplify/api";
import { UserStorage } from "../../types";

//todo: split into different classes
Amplify.configure(outputs)
const client = generateClient<Schema>()

export const Base = () => {
    const navigate = useNavigate()
    useEffect(() => {
        async function verifyUser(){
            if(!window.localStorage.getItem('user')){
                const user = await getCurrentUser();
                const session = await fetchAuthSession();
                if(user && session && session.tokens && session.tokens?.accessToken){
                    const attributes = await fetchUserAttributes()
                    const groups = JSON.stringify(session.tokens?.accessToken.payload['cognito:groups'])
                    const profile = await client.models.UserProfile.get({id: user.userId}, {authToken: session.tokens?.accessToken.toString()})
                    window.localStorage.setItem('user', JSON.stringify({
                        user: user, 
                        session: session,
                        attributes: attributes, 
                        groups: groups, 
                        profile: profile
                    }))
                    if(groups.includes('ADMINS')){
                        navigate('admin/dashboard')
                    }
                    navigate('client/dashboard', {
                        state: {
                            unauthorized: true
                        }
                    })
                }
            }
            else{
                console.log(window.localStorage.getItem('user'))
                const userStorage: UserStorage = JSON.parse(window.localStorage.getItem('user')!)
                if(userStorage.groups.includes('ADMINS')){
                    navigate('admins/dashboard')
                }
                navigate('client/dashboard', {
                    state: {
                        unauthorized: true
                    }
                })
            }
            navigate('login', {
                state: {
                    unauthorized: true
                }
            })
        }
        verifyUser()
    }, [])
    return (
        <>
        </>
    )
}
