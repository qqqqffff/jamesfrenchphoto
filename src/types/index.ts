import { AuthSession, AuthUser, FetchUserAttributesOutput } from "aws-amplify/auth";

export interface UserStorage {
    user: AuthUser
    session: AuthSession
    attributes: FetchUserAttributesOutput
    groups: string
    profile: any
} 

export interface UserData {
    email: string;
    verified: boolean;
    last: string;
    first: string;
    userId: string;
    status: string;
    created?: Date;
    updated?: Date;
    enabled?: boolean;
}

export interface UserProfile {
    email: string,
    userTags: string[],
    preferredName?: string,
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
    name?: string;
    coverPath: string | null;
    createdAt: string;
    id: string;
    updatedAt: string;
    subcategoryId?: string
}

export type Subcategory = {
    id: string,
    name: string,
    headers?: string[],
    type: string,
    eventId: string,
}

export type Timeslot = {
    id: string,
    tagId?: string,
    capacity: number;
    registers: string[];
    start: Date;
    end: Date;
}

export type UserTag = {
    id: string,
    name: string,
    color?: string,
    collectionId?: string,
}
