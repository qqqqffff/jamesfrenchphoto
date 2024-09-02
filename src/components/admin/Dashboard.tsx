import { useNavigate } from "react-router-dom";
import Header from "../header/Header";
import { Amplify } from "aws-amplify";
import outputs from '../../../amplify_outputs.json'

Amplify.configure(outputs)
// const client = client

export const Dashboard = () => {
    return (
        <>
            Hello {'admin'}
        </>
    )
}