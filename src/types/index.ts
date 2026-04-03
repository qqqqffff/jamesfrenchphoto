import { AuthSession, AuthUser, FetchUserAttributesOutput } from "aws-amplify/auth";
import { Duration } from "luxon";
import { OrderRefID } from "./order-ref-id";

export interface UserStorage {
    user: AuthUser
    session: AuthSession
    attributes: FetchUserAttributesOutput
    groups: string
    profile: UserProfile
} 

export type Order = {
    id: string,
    customerId: string,
    invoiceId: string,
    amount: number,
    serviceFee: number,
    currency: 'USD',
    status: 'PAYER_ACTION_REQUIRED' | 'COMPLETED' | 'UNKNOWN' | 'VOIDED' | 'APPROVED' | 'SAVED' | 'CREATED',
    items: OrderItem[],
    userEmail: string,
    paymentApprovalUrl?: string,
}

export type OrderItem = {
    name: string,
    description: string,
    amount: number,
    serviceChargeAmount: number,
    referenceId: OrderRefID,
    
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

export interface CustomerProfile {
    userEmail: string,
    userId: string,
    paypalCustomerId: string,
    savedPaymentMethods: CustomerSavedPaymentMethod[],
    orders: Order[],
    billingAddresses: CustomerBillingAddress[]
}

export interface CustomerSavedPaymentMethod {
    id: string,
    customerId: string,
    vaultId?: string, //not returned for admins
    type: 'PAYPAL' | 'CARD' | 'APPLEPAY'
    isDefault: boolean,
    userEmail: string,
}

export interface CustomerBillingAddress {
    id: string
    userEmail: string
    customerId: string
    default: boolean
    addressLineOne: string
    addressLineTwo?: string,
    adminAreaTwo: string,
    adminAreaOne: string,
    postalCode: string,
    countryCode: string,
    createdAt: string,
}

export interface UserProfile {
    sittingNumber: number,
    email: string,
    preferredContact: "EMAIL" | "PHONE",
    participant: Participant[],
    activeParticipant?: Participant,
    firstName?: string,
    lastName?: string,
    temporary?: string
    customerProfile?: CustomerProfile
}

export interface Participant {
    id: string,
    firstName: string,
    lastName: string,
    userTags: UserTag[],
    createdAt: string,
    middleName?: string,
    preferredName?: string,
    email?: string,
    contact: boolean,
    timeslot?: Timeslot[],
    userEmail: string,
    notifications: Notification[],
    collections: PhotoCollection[]
}

export interface ParticipantFields {
    type: 'first' | 'preferred' | 'middle' | 'last' | 'email'
}

export interface UserFields {
    type: 'first' | 'last' | 'sitting' | 'email'
}

export type Notification = {
    id: string,
    content: string,
    location?: 'dashboard'
    participants: Participant[]
    tags: UserTag[]
    expiration?: string,
    createdAt: string,
    updatedAt: string,
    temporary?: boolean,
}

export type User = {
    user: UserProfile
    data?: UserData
}

export type Favorite = {
    id: string,
    participantId: string,
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
    setId: string;
    width: number;
    height: number;
}

export type Watermark = {
    id: string,
    url: string,
    path: string,
}

export interface DownloadData {
  id: string,
  state: 'inprogress' | 'done' | 'paused' | 'idle'
  progress: number,
  totalItems: number,
  display: boolean,
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
    items: number;
    creating?: boolean
}

export type Timeslot = {
    id: string,
    tag?: UserTag,
    register?: string,
    noshowFee?: number,
    cancelationFee?: {
        amount: number,
        window: Duration
    }
    start: Date;
    end: Date;
    participantId?: string,
    description?: string,
    updatedAt: string,
}

export type UserTag = {
    id: string,
    name: string,
    color?: string,
    collections?: PhotoCollection[],
    timeslots?: Timeslot[]
    package?: Package,
    notifications?: Notification[],
    children: UserTag[],
    temporary?: boolean,
    participants: Participant[],
    createdAt: string,
}

export type Package = {
    id: string,
    name: string,
    description?: string,
    items: PackageItem[]
    tagId: string,
    parentTagId?: string,
    pdfPath?: string,
    createdAt: string,
    temporary?: boolean,
    advertise: boolean,
    price?: string,
}

export type PackageItem = {
    id: string
    name: string
    description?: string
    quantities?: number
    max?: number
    hardCap?: number
    packageId: string,
    price?: string,
    collectionIds: string[],
    order: number,
    dependent?: string,
    statements?: string[]
    unique?: boolean,
    aLaCarte?: boolean,
    display?: boolean,
    createdAt: string,
}

export type PackageDiscount = {
    id: string,
    packageId: string,
    itemId: string,
    discount: number,
}

export interface TableGroup {
    id: string,
    name: string,
    tables: Table[],
    temporary?: boolean,
    edit?: boolean,
    createdAt: string,
}

export interface Table {
    id: string,
    name: string,
    columns: TableColumn[],
    tableGroupId: string,
    temporary?: boolean,
    edit?: boolean,
    createdAt: string,
    order: number
}

export interface TableColumn {
    id: string,
    header: string,
    values: string[],
    type: 'value' | 'date' | 'choice' | 'tag' | 'file' | 'notification',
    choices?: string[],
    color?: ColumnColor[],
    display: boolean,
    tags: UserTag[],
    sort?: 'ASC' | 'DSC',
    tableId: string,
    order: number,
    temporary?: boolean,
    edit?: boolean
}

export type ColumnColor = {
    id: string,
    value: string
    bgColor?: string
    textColor?: string
    columnId: string,
}

export interface TemporaryAccessToken {
    id: string,
    expires?: Date,
    sessionTime?: Duration,
    collectionId: string
}

export interface Segment {
  id: string;
  startMin: number;
  endMin: number;
  interval: number;
  userTag?: UserTag;
  options?: {
    noshowFee?: number,
    description?: string,
    cancelationFee?: {
        amount: number,
        window: Duration
    }
  }
}

export interface APIMutationResponse {
    status: 'Success' | 'Fail',
    error?: string
}

export interface BaseAPIParams {
    options?: {
        logging?: boolean,
        metric?: boolean
    }
}

export type CollectPaymentIntent = {
    type: 'timeslot',
    timeslotId: string,
    captureShortnotice?: boolean
    vaultNoshow?: boolean
}

export type UserFieldLinks = {
  email: [string, string],
  first: [string, 'update' | 'override'] | null,
  last: [string, 'update' | 'override'] | null,
  sitting: [string, 'update' | 'override'] | null,
}

export type ParticipantFieldLinks = {
  id: string,
  first: [string, 'update' | 'override'] | null, 
  last: [string, 'update' | 'override'] | null,
  middle: [string, 'update' | 'override'] | null,
  preferred: [string, 'update' | 'override'] | null,
  email: [string, 'update' | 'override'] | null,
  tags: [string, 'update' | 'override'] | null,
  timeslot: [string, 'update' | 'override'] | null,
  notifications: [string, 'update' | 'override'] | null,
}

export interface RegistrationProfile extends UserProfile { 
  password: string, 
  confirm: string,
  phone?: string
  terms: boolean
}

export interface RegistrationFormError {
  id: | {
    step: RegistrationFormStep.User,
    location: 'first' | 'last' | 'phone' | 'email'
  } | {
    step: RegistrationFormStep.Participant,
    participantId: string,
    location: 'first' | 'last' | 'preferred' | 'middle' | 'email'
  } | {
    step: RegistrationFormStep.Confirm,
    location: 'password' | 'confirm' | 'terms'
  } | {
    step: 'global',
    action?: JSX.Element
  }
  message: string
}

export enum RegistrationFormStep {
  'User' = 'User',
  'Participant' = 'Participant',
  'Confirm' = 'Confirm'
}

export type CollectPaymentFormStep = 'billing' | 'payment' | 'review'
