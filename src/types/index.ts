import { AuthSession, AuthUser, FetchUserAttributesOutput } from "aws-amplify/auth";

export interface UserStorage {
    user: AuthUser
    session: AuthSession
    attributes: FetchUserAttributesOutput
    groups: string
    profile: any
} 

export type PicturePath = {
    id: string;
    url: string;
    path: string;
    height: number;
    width: number;
    order: number;
}

export type PhotoCollection = {
    coverPath: string | null;
    createdAt: string;
    id: string;
    updatedAt: string;
}

export type Subcategory = {
    id: string,
    name: string,
    headers?: string[],
    type: string,
    eventId: string,
}
