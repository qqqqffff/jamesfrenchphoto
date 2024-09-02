import { Amplify } from "aws-amplify";
import outputs from '../../../amplify_outputs.json'
import { generateClient } from "aws-amplify/api";
import { Schema } from "../../../amplify/data/resource";
import { fetchAuthSession, fetchUserAttributes, getCurrentUser } from "aws-amplify/auth";
import { useEffect } from "react";

Amplify.configure(outputs)
const client = generateClient<Schema>()

export const Dashboard = () => {
    useEffect(() => {
        const getUser = async () => {
            const { username, userId, signInDetails } = await getCurrentUser();
            const session = await fetchAuthSession()
            const resp = await fetchUserAttributes()
            const user = await client.models.UserProfile.get({id: userId}, {authToken: session.tokens?.accessToken.toString()})
            console.log(username, userId, signInDetails, resp, session, user);
        }
        // getUser()
    }, [])
    return (
        <>
            hello world
        </>
    )
}