import { generateClient } from "aws-amplify/api"
import { Schema } from "aws-amplify/datastore"
import { useEffect } from "react"

const client = generateClient<Schema>()

export default function UserManagement(){
    useEffect(() => {
        // window.sessionStorage.setItem('users', JSON.stringify(client.queries.))
    }, [])
    return (
        <>
            Hello worl
        </>
    )
}