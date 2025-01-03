import { fetchAuthSession, fetchUserAttributes, getCurrentUser } from "aws-amplify/auth"
import { useEffect } from "react"
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom"
import { Amplify } from "aws-amplify";
import outputs from '../../../amplify_outputs.json'
import { Schema } from "../../../amplify/data/resource";
import { generateClient } from "aws-amplify/api";
import { UserStorage } from "../../types";

Amplify.configure(outputs)
const client = generateClient<Schema>()

export const Base = () => {
    const navigate = useNavigate()
    const location = useLocation()
    
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
                navigate(location.pathname)
            }
            else if(group === 'USERS'){
                const path = location.pathname.includes('admin') ? location.pathname.replace('admin', 'client') : 
                    location.pathname  === '/client' ? '/client/dashboard' : location.pathname
                navigate(path)
            }
            
        }

        if(window.localStorage.getItem('user')){
            const tempUser: UserStorage = JSON.parse(window.localStorage.getItem('user')!)
            if(tempUser.groups.includes('ADMINS')){
                navigate(location.pathname)
            }
            else if(tempUser.groups.includes('USERS')){
                const path = location.pathname.includes('admin') ? location.pathname.replace('admin', 'client') : location.pathname
                navigate(path)
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
            {location.pathname === '/client' ? (
                <div className="w-full flex flex-col items-center justify-center">
                    <p>If you are seeing this page, that means you are not logged in or an error occured. Please click the following link or refresh your page</p>
                    <Link to='/login' className="hover:underline text-blue-500">Click here to login</Link>
                </div>
            ) : (
                <></>
            )}
            <Outlet />
        </>
    )
}
