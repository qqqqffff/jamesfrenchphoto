import { FC, Key } from "react"
import { PhotoCollection } from "../../types"
import { Tooltip } from "flowbite-react"

interface CollectionThumbnailProps {
    collection: PhotoCollection,
    coverPath?: string,
    onClick: () => void,
    key?: Key
}

const component: FC<CollectionThumbnailProps> = ({ collection, coverPath, onClick, key }) => {
    return (
        <div className="flex flex-col">
            <button 
                className="flex flex-row relative justify-center items-center rounded-lg bg-gray-200 border border-black w-[360px] h-[240px] hover:bg-gray-300 hover:text-gray-500"
                onClick={() => onClick()}
                key={key}
            >
                {coverPath ? (
                    <img src={coverPath} className="max-h-[240px] max-w-[360px] object-cover"/>
                ) : (
                    <div className="absolute flex flex-col inset-0 place-self-center text-center items-center justify-center">
                        <p className={`font-thin opacity-90 text-2xl`}>No Cover</p>
                    </div>
                )}
            </button>
            <div className="flex flex-row gap-1 font-thin opacity-90 items-center justify-start">
                <Tooltip content={(<p>Collection Has {collection.published ? 'Been Published' : 'Not Been Published'}</p>)}>
                    <p className={`${collection.published ? 'text-green-400' : 'text-gray-400'}`}>{collection.name}</p>
                </Tooltip>
                <p>&bull;</p>
                <p>Items: {collection.items}</p>
                <p>&bull;</p>
                <p>{new Date(collection.createdAt).toLocaleDateString('en-US', { timeZone: 'America/Chicago' })}</p>
            </div>
        </div>
        
    )
}

export default component