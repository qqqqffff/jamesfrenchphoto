import { useEffect } from "react";
import { signOut } from "aws-amplify/auth";
import { useNavigate } from "@tanstack/react-router";

export default function SignOut() {
    //TODO: handle no profile error!
    const navigate = useNavigate()
    useEffect(() => {
        async function Logout() {
            if(window.localStorage.getItem('user')){
                window.localStorage.removeItem('user')
                await signOut()
                navigate({ to: '/', params: { logoutSuccess: true }})
            }
            else{
                navigate({ to: '/', params: { noAccount: true }})
            }
        } 
        Logout()
    }, [])

    return (
        <></>
    )
}