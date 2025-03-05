export enum EmailType {
    InvalidType = -1,
    CreateUserEmail = 0,
    ContactEmail = 1,
}

export interface IEmail {
    address: string,
    emailType: EmailType,
    attributes: Record<string, string>,
}

