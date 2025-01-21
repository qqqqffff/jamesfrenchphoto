import { FC, Key, useCallback } from "react"
import { PhotoCollection } from "../../../types"
import { Tooltip } from "flowbite-react"
import { useDropzone } from "react-dropzone"

interface CollectionThumbnailProps {
    collection: PhotoCollection,
    coverPath?: string,
    onClick?: () => void,
    key?: Key,
    allowUpload?: boolean,
    contentChildren?: JSX.Element,
}

const component: FC<CollectionThumbnailProps> = ({ collection, coverPath, onClick, key, allowUpload, contentChildren }) => {
    const onDrop = useCallback((acceptedFiles: File[]) => {
        console.log(acceptedFiles)
    }, [])
    const dropzone = allowUpload ? useDropzone({noClick: true, onDrop}) : null
    return (
        <div className="flex flex-col" key={key}>
            {!dropzone ? (
                <button 
                    className={`flex flex-row relative justify-center items-center rounded-lg bg-gray-200 border border-black w-[360px] h-[240px] ${onClick !== undefined ? 'hover:bg-gray-300 hover:text-gray-500' : 'pointer-events-none cursor-default'}`}
                    onClick={() => {if(onClick !== undefined) onClick()}}
                >
                    {coverPath ? (
                        <img src={coverPath} className="max-h-[240px] max-w-[360px] object-cover"/>
                    ) : (
                        <div className="absolute flex flex-col inset-0 place-self-center text-center items-center justify-center">
                            <p className={`font-thin opacity-90 text-2xl`}>No Cover</p>
                        </div>
                    )}
                </button>
            ) : (
                <label 
                    htmlFor="dropzone-file"
                    className={`flex flex-row relative justify-center items-center rounded-lg bg-gray-200 border border-black w-[360px] h-[240px] ${onClick !== undefined ? 'hover:bg-gray-300 hover:text-gray-500' : 'pointer-events-none cursor-default'}`}
                    {...dropzone?.getRootProps()}
                >
                    <div className="absolute flex flex-col inset-0 place-self-center text-center items-center justify-center">
                        <p className={`font-thin opacity-90 text-2xl`}>No Cover</p>
                        <p className="font-thin opacity-50">{dropzone?.isDragActive ? 'Drop Here' : 'Cick or Drag to Upload'}</p>
                        <p className="text-xs text-gray-500">Image Files Supported</p>
                    </div>
                    <input id='dropzone-file' type="file" className="hidden" {...dropzone?.getInputProps()}/>
                </label>
            )}
            <div className="flex flex-row justify-between w-full">
                <div className="flex flex-row gap-1 font-thin opacity-90 items-center justify-start">
                    <Tooltip content={(<p>Collection Has {collection.published ? 'Been Published' : 'Not Been Published'}</p>)}>
                        <p className={`${collection.published ? 'text-green-400' : 'text-gray-400'}`}>{collection.name}</p>
                    </Tooltip>
                    <p>&bull;</p>
                    <p>Items: {collection.items}</p>
                    <p>&bull;</p>
                    <p>{new Date(collection.createdAt).toLocaleDateString('en-US', { timeZone: 'America/Chicago' })}</p>
                </div>
                {contentChildren}
            </div>
        </div>
        
    )
}

export default component