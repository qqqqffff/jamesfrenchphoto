import { AuthSession, AuthUser, FetchUserAttributesOutput } from "aws-amplify/auth";

export interface UserStorage {
    user: AuthUser
    session: AuthSession
    attributes: FetchUserAttributesOutput
    groups: string
    profile: any
} 