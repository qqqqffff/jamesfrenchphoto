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
    profile?: UserProfile
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
    firstName?: string,
    lastName?: string
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
    userEmail: string,
    notifications: Notification[]
}

export type Notification = {
    id: string,
    content: string,
    location: 'dashboard'
    participantId?: string
    tagId?: string,
    expiration?: string
}

export type User = {
    user: UserProfile
    data?: UserData
}

export type Favorite = {
    id: string,
    userEmail: string,
    pathId: string,
    createdAt: Date,
    updatedAt: Date,
}

export type ShareTemplate = {
    id: string,
    name: string,
    header?: string,
    header2?: string,
    body?: string,
    footer?: string,
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

export type CoverType = {
    textColor?: string,
    bgColor?: string,
    placement?: 'center' | 'left' | 'right',
    textPlacement?: 'center' | 'top' | 'bottom'
    date?: string
}

export type PhotoCollection = {
    name: string;
    coverPath?: string;
    coverType?: CoverType
    publicCoverPath?: string;
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
    timeslots?: Timeslot[]
    package?: Package,
}

export type Package = {
    id: string,
    name: string,
    tag: UserTag,
    pdfPath: string,
}

export interface TableGroup {
    id: string,
    name: string,
    tables: Table[]
}

export interface Table {
    id: string,
    name: string,
    columns: TableColumn[],
    tableGroupId: string
}

export interface TableColumn {
    id: string,
    header: string,
    values: string[],
    type: 'value' | 'user' | 'date' | 'choice'  | 'tag' | 'file',
    choices?: string[],
    color?: ColumnColor[],
    display: boolean,
    tags: UserTag[],
    sort?: 'ASC' | 'DSC',
    tableId: string,
    order: number,
}

export type ColumnColor = {
    id: string,
    value: string
    bgColor?: string
    textColor?: string
    columnId: string
}

export interface TemporaryAccessToken {
    id: string,
    expires?: Date,
    sessionTime?: Duration,
    collectionId: string
}