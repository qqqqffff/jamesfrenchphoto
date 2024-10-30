import { generateClient } from "aws-amplify/api";
import { Schema } from "../../../amplify/data/resource";
import { ModalProps } from ".";
import { UserData, UserProfile, UserTag } from "../../types";
import { FC, useEffect, useState } from "react";
import { Badge, Dropdown, Modal } from "flowbite-react";
import { badgeColorThemeMap_hoverable, GetColorComponent } from "../../utils";

const client = generateClient<Schema>()

interface UserProfileProps extends ModalProps {
    user?: UserData
}

interface FilledProfileModalProps extends ModalProps {
    user: UserData
}

export const FilledProfileModal: FC<FilledProfileModalProps> = ({open, onClose, user}) => {
    const [userProfile, setUserProfile] = useState<UserProfile | undefined>()
    const [userTags, setUserTags] = useState<UserTag[]>([])
    const [userProfileTags, setUserProfileTags] = useState<UserTag[]>([])
    const [apiCall, setApiCall] = useState(false)
    
    useEffect(() => {
        async function api(){
            console.log('api call')
            if(!user) {
                setApiCall(true)
                return
            }

            //get user profile
            const getProfileResponse = (await client.models.UserProfile.get({email: user.email})).data
            let profile: UserProfile | null = getProfileResponse ? {
                ...getProfileResponse,
                userTags: getProfileResponse.userTags ? getProfileResponse.userTags as string[] : [],
                preferredName: getProfileResponse.preferredName ? getProfileResponse.preferredName : undefined
            } : null
            if(!profile){
                const response = await client.models.UserProfile.create({
                    email: user.email
                })
                profile = {
                    email: response.data!.email,
                    userTags: [],
                }
            }

            console.log(profile)
            
            //get user tags
            const userTags = (await client.models.UserTag.list()).data
            const userTagIds = userTags.map((tag) => tag.id)
            const filteredUserTags = profile.userTags.filter((tag) => userTagIds.includes(tag))

            if(filteredUserTags.length < profile.userTags.length){
                console.log(filteredUserTags, profile.userTags, userTagIds)
                const response = await client.models.UserProfile.update({
                    email: profile.email,
                    userTags: filteredUserTags
                })
                profile = {
                    email: response.data!.email,
                    userTags: response.data!.userTags ? response.data!.userTags as string[] : [],
                    preferredName: response.data!.preferredName ? response.data!.preferredName : undefined
                }
                console.log(response, profile)
            }

            setUserProfile(profile)
            setUserTags(userTags.map((tag) => ({
                ...tag,
                color: tag.color ? tag.color : undefined,
                collectionId: tag.collectionId ? tag.collectionId : undefined,
            })))
            setUserProfileTags(await Promise.all(profile.userTags.map(async (tag) => {
                const response = (await client.models.UserTag.get({id: tag})).data!
                return {
                    ...response,
                    color: response.color ? response.color : undefined,
                    collectionId: response.collectionId ? response.collectionId : undefined
                }
            })))
            setApiCall(true)
        }
        if(!apiCall && open){
            api()
        }
    })

    function clearState(){
        setUserProfileTags([])
        setUserProfile(undefined)
        setApiCall(false)
    }

    return (
        <Modal show={open} onClose={() => {
            clearState()
            onClose()
        }}>
            <Modal.Header>Profile of: {user.email}</Modal.Header>
            <Modal.Body>
                <div className="flex flex-col w-full items-center justify-center">
                    <div className="grid grid-cols-3 gap-y-2">
                        <span className="text-lg underline-offset-2 underline">First Name:</span>
                        <span className="text-lg underline-offset-2 underline">Last Name:</span>
                        <span className="text-lg underline-offset-2 underline">Preferred Name:</span>
                        <span className="italic text-gray-700">{user.first}</span>
                        <span className="italic text-gray-700">{user.last}</span>
                        <span className="italic text-gray-700">{userProfile && userProfile.preferredName ? userProfile.preferredName : 'N/A'}</span>
                    </div>
                    <div className="flex flex-row gap-2 mt-2">
                        {userProfileTags.length > 0 ? (
                            <>
                            {userProfileTags.map((tag, index) => {
                                return (
                                    <button onClick={async () => {
                                        const response = await client.models.UserProfile.update({
                                            email: user.email,
                                            userTags: userProfileTags.filter((t) => tag.id != t.id).map((t) => t.id)
                                        })
                                        console.log(response)
                                        const profile: UserProfile = {
                                            email: response.data!.email,
                                            userTags: response.data!.userTags ? response.data!.userTags as string[] : [],
                                            preferredName: response.data!.preferredName ? response.data!.preferredName : undefined
                                        }
                                        setUserProfile(profile)
                                        setUserProfileTags(await Promise.all(profile.userTags.map(async (tag) => {
                                            const response = (await client.models.UserTag.get({id: tag})).data!
                                            return {
                                                ...response,
                                                color: response.color ? response.color : undefined,
                                                collectionId: response.collectionId ? response.collectionId : undefined
                                            }
                                        })))
                                    }}>
                                        <Badge theme={badgeColorThemeMap_hoverable} color={tag.color ? tag.color : 'light'} key={index} className="py-1 text-md hover:line-through">{tag.name}</Badge>
                                    </button>
                                )
                            })}
                            <Badge className="py-1 text-md" color="light">
                                <Dropdown label='Add Tag' inline>
                                    {userTags.filter((tag) => !userProfile!.userTags.includes(tag.id)).length > 0 ? 
                                        (userTags.filter((tag) => !userProfile!.userTags.includes(tag.id)).map((tag, index) => {
                                            return (
                                                <Dropdown.Item key={index} onClick={async () => {
                                                    const response = await client.models.UserProfile.update({
                                                        email: user.email,
                                                        userTags: [tag.id],
                                                    })
                                                    console.log(response)
                                                    const profile: UserProfile = {
                                                        email: response.data!.email,
                                                        userTags: response.data!.userTags ? response.data!.userTags as string[] : [],
                                                        preferredName: response.data!.preferredName ? response.data!.preferredName : undefined
                                                    }
                                                    setUserProfile(profile)
                                                    setUserProfileTags(await Promise.all(profile.userTags.map(async (tag) => {
                                                        const response = (await client.models.UserTag.get({id: tag})).data!
                                                        return {
                                                            ...response,
                                                            color: response.color ? response.color : undefined,
                                                            collectionId: response.collectionId ? response.collectionId : undefined
                                                        }
                                                    })))
                                                }}>
                                                    <GetColorComponent activeColor={tag.color} customText={tag.name} />
                                                </Dropdown.Item>)
                                        })) : (<span>No more tags to add!</span>)
                                    }
                                </Dropdown>
                            </Badge>
                            </>
                        ) : (<span className="text-gray-400 italic flex flex-row gap-2">User has no tags
                                <Dropdown label='Click Here' inline>
                                    {userTags.map((tag, index) => {
                                        return (
                                            <Dropdown.Item key={index} onClick={async () => {
                                                const response = await client.models.UserProfile.update({
                                                    email: user.email,
                                                    userTags: [tag.id],
                                                })
                                                console.log(response)
                                                const profile: UserProfile = {
                                                    email: response.data!.email,
                                                    userTags: response.data!.userTags ? response.data!.userTags as string[] : [],
                                                    preferredName: response.data!.preferredName ? response.data!.preferredName : undefined
                                                }
                                                setUserProfile(profile)
                                                setUserProfileTags(await Promise.all(profile.userTags.map(async (tag) => {
                                                    const response = (await client.models.UserTag.get({id: tag})).data!
                                                    return {
                                                        ...response,
                                                        color: response.color ? response.color : undefined,
                                                        collectionId: response.collectionId ? response.collectionId : undefined
                                                    }
                                                })))
                                            }}>
                                                <GetColorComponent activeColor={tag.color} customText={tag.name} />
                                            </Dropdown.Item>)
                                    })}
                                </Dropdown>
                                to ddd!
                            </span>)}
                        
                    </div>
                </div>
            </Modal.Body>
        </Modal>
    )
}

export const UserProfileModal: FC<UserProfileProps> = ({open, onClose, user}) => {
    if(!user) return (<EmptyProfileModal open={open} onClose={onClose} />)
    return (<FilledProfileModal open={open} onClose={onClose} user={user} />)
}

const EmptyProfileModal: FC<ModalProps> = ({open, onClose}) => (
    <Modal show={open} onClose={() => {
        onClose()
    }}>
        <Modal.Header>Undefined User!</Modal.Header>
        <Modal.Body>
            <div className="flex flex-row py-4 items-center justify-center">
                <span>No User to Show!</span>
            </div>
        </Modal.Body>
    </Modal>
)