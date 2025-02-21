import { AuthSession, AuthUser, FetchUserAttributesOutput } from "aws-amplify/auth";
import { Duration } from "luxon";

export interface UserStorage {
    user: AuthUser
    session: AuthSession
    attributes: FetchUserAttributesOutput
    groups: string
    profile: UserProfile
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
    sittingNumber: number,
    email: string,
    userTags: string[],
    preferredName?: string,
    timeslot?: Timeslot[],
    participantFirstName?: string,
    participantLastName?: string,
    participantMiddleName?: string,
    participantPreferredName?: string,
    preferredContact: "EMAIL" | "PHONE",
    participantContact?: boolean,
    participantEmail?: string,
    participant: Participant[],
    activeParticipant?: Participant,
}

export interface Participant {
    id: string,
    firstName: string,
    lastName: string,
    userTags: UserTag[],
    middleName?: string,
    preferredName?: string,
    email?: string,
    contact: boolean,
    timeslot?: Timeslot[],
}

export type User = {
    user: UserProfile
    data?: UserData
}

export type Favorite = {
    id: string,
    userEmail: string,
    pathId: string,
}

export type PicturePath = {
    id: string;
    url: string;
    path: string;
    order: number;
    favorite?: string;
}

export type Watermark = {
    id: string,
    url: string,
    path: string,
}

export type PhotoCollection = {
    name: string;
    coverPath?: string;
    createdAt: string;
    id: string;
    updatedAt: string;
    tags: UserTag[],
    sets: PhotoSet[],
    watermarkPath?: string,
    downloadable: boolean,
    items: number,
    published: boolean
}

export type PhotoSet = {
    id: string;
    watermarkPath?: string,
    name: string,
    paths: PicturePath[],
    order: number,
    collectionId: string;
}

export type Timeslot = {
    id: string,
    tag?: UserTag,
    register?: string,
    start: Date;
    end: Date;
    participant?: Participant,
}

export type UserTag = {
    id: string,
    name: string,
    color?: string,
    collections?: PhotoCollection[],
    package?: Package,
}

export type Package = {
    id: string,
    name: string,
    tag: UserTag,
    pdfPath: string,
}

export interface UserColumnDisplay {
    id: string,
    heading: string,
    color?: ColumnColor[],
    display: boolean,
    tag: string,
    sort?: 'ASC' | 'DSC'
}

export type ColumnColor = {
    id: string,
    value: string
    bgColor?: string
    textColor?: string
}

export interface TemporaryAccessToken {
    id: string,
    expires?: Date,
    sessionTime?: Duration,
    collectionId: string
}