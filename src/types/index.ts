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

export type PicturePath = {
    id: string;
    url: string;
    path: string;
    height: number;
    width: number;
    order: number;
}

export type PhotoCollection = {
    name: string;
    coverPath?: string;
    createdAt: string;
    id: string;
    updatedAt: string;
    eventId: string;
}

export type Timeslot = {
    id: string,
    tagId?: string,
    register?: string,
    start: Date;
    end: Date;
}

export type UserTag = {
    id: string,
    name: string,
    color?: string,
    collections?: PhotoCollection[],
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
