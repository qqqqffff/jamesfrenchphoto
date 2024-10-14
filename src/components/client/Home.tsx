import { FC, useEffect, useState } from "react";
import { PhotoCollection, UserStorage } from "../../types";
import { Schema } from "../../../amplify/data/resource";
import { generateClient } from "aws-amplify/api";
import { Button } from "flowbite-react";
const client = generateClient<Schema>()

interface ClientHomeProps {
    user: UserStorage
}

export const Home: FC<ClientHomeProps> = ({ user }) => {
    const [collections, setCollections] = useState<PhotoCollection[]>([])
    const [fetchComplete, setFetchComplete] = useState(false)
    useEffect(() => {
        async function fetchCollection(){
            let temp: PhotoCollection[] | undefined
            const userProfile = (await client.models.UserProfile.get({ email: '1apollo.rowe@gmail.com' })).data
            console.log(userProfile)
            if(userProfile?.userTags){
                temp = []
                setCollections(temp)
                console.log(user)
                // collections = await Promise.all(userProfile.userTags.filter((tag) => tag !== null).map(async (tag) => 
                //     (await client.models.PhotoCollection.listPhotoCollectionByTagId({ tagId: tag })).data[0]
                // ))
                // collections = await Promise.all(collections.filter((collection) => collection.subcategoryId).map(async (collection) => {
                //     return {
                //         ...collection,
                //         name: (await client.models.SubCategory.get({ id: collection.subcategoryId! })).data?.name
                //     }
                // }))
            }
            setFetchComplete(true)
        }
        if(!fetchComplete){
            fetchCollection()
        }
    })
    
    return (
        <div className="grid grid-cols-6 mt-8 font-main">
            <div className="flex flex-col items-center justify-center col-start-2 col-span-4 border-black border rounded-xl">
                <Button
                onClick={async () => {
                    // const response = await client.models.UserProfile.list()
                    // const response = await client.models.UserProfile.create({email: user.attributes.email!})
                    // const response = await client.models.UserTag.create({
                    //     name: 'TRF Princess Debutante 2024',
                    //     collectionId: "e2606167-0002-4503-a001-dff283705f51"
                    // })
                    // const response = await client.models.UserProfile.update({
                    //     email: '1apollo.rowe@gmail.com',
                    //     userTags: ["3ef8bb7b-5cf8-4361-8ef3-50c8be2d493a"]
                    // })
                    // const response = await client.models.PhotoCollection.update({ 
                    //     id: "e2606167-0002-4503-a001-dff283705f51",
                    //     tagId: "3ef8bb7b-5cf8-4361-8ef3-50c8be2d493a" 
                    // })
                    // const response = await client.models.PhotoPaths.list()
                    const response = await client.models.SubCategory.list()
                    console.log(response)
                }}
                >this does something</Button>
                <span className="text-3xl">Your Collections:</span>
                {collections?.filter((collection) => collection.name).map((collection) => {
                    return (
                        <a href={`/photo-collection/${collection.id}`}>{collection.name}</a>
                    )
                })}
            </div>
        </div>
    )
}