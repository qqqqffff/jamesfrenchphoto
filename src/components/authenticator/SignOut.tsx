import { useEffect } from "react";
import { signOut } from "aws-amplify/auth";
import { useNavigate } from "react-router-dom";

export default function SignOut() {
    //TODO: handle no profile error!
    const navigate = useNavigate()
    useEffect(() => {
        async function Logout() {
            if(window.localStorage.getItem('user')){
                window.localStorage.removeItem('user')
                await signOut()
                navigate('/', {
                    state: {
                        logoutSuccess: true
                    }
                })
            }
            else{
                navigate('/', {
                    state: {
                        noAccount: true
                    }
                })
            }
        } 
        Logout()
    }, [])

    return (
        <></>
    )
}