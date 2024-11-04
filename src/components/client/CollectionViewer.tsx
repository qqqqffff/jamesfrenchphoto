import { useLoaderData, useNavigate } from "react-router-dom"
import { useEffect, useRef, useState } from "react"
import { Button } from "flowbite-react"
import { PicturePath } from "../../types"

export const CollectionViewer = () => {
    
    const collection = useLoaderData() as PicturePath[]

    const coverPath = 
        {url: collection[0].url}
    // console.log(collection)
    const navigate = useNavigate()
    const coverPhotoRef = useRef<HTMLImageElement | null>(null)
    // const [photos, setPhotos] = useState<PicturePath[] | undefined>()
    const navigateControls = history.state && history.state.usr && history.state.usr.origin === 'admin'
    const innerWindowHeight = window.innerHeight + 'px'
    const [coverPhoto, setCoverPhoto] = useState((<img ref={coverPhotoRef} src={coverPath.url} className={`max-h-[911px]`}/>))
    useEffect(() => {
        const handlerResize = () => {
            const innerWindowHeight = window.innerHeight + 'px'
            setCoverPhoto((<img ref={coverPhotoRef} src={coverPath.url} className={`object-cover w-full max-h-[${innerWindowHeight}]`}/>))
        }

        window.addEventListener('resize', handlerResize)

        if(coverPhotoRef && coverPhotoRef.current) {
            console.log('hi')
            coverPhotoRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }

        return () => {
            window.removeEventListener('resize', handlerResize)
        }
    }, [coverPhotoRef])    

    console.log(innerWindowHeight)
    let temp: PicturePath[] = []
    const formattedCollection: PicturePath[][] = []

    collection.forEach((picture, index) => {
        if(index == 0 || (index % Number((collection.length / 5).toFixed(0))).toFixed(0) != '0'){
            temp.push(picture)
        }
        else{
            formattedCollection.push(temp)
            temp = []
            temp.push(picture)
        }
    })

    console.log(formattedCollection)


    return (
        <div className="font-main">
            <div className="flex flex-row justify-center mb-10">
                <Button color='light' onClick={() => navigate(`/${navigateControls ? 'admin' : 'client'}/dashboard`)}>{navigateControls ? 'Return to Admin Console' : 'Return Home'}</Button>
            </div>
            <div className="border border-black flex flex-row justify-center items-center mb-2 relative">
                <div className="absolute flex flex-col inset-0 place-self-center items-center justify-center">
                    <p className="md:text-6xl sm:text-3xl font-thin">Test collection</p>
                    <p className="italic md:text-4xl">{new Date().toLocaleDateString()}</p>
                </div>
                {coverPhoto}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mx-4">
                {formattedCollection  && formattedCollection.length > 0 ? formattedCollection.map((subCollection, index) => {
                    return (
                        <div key={index} className="flex flex-col gap-4">
                            {subCollection.map((picture, s_index) => {
                                console.log(picture)

                                return (
                                    <div>
                                        <img key={s_index} className="h-auto max-w-full rounded-lg" src={picture.url} alt="" />
                                    </div>
                                )
                            })}
                        </div>
                    )
                }) : (<></>)}
            </div>
            <Button
                color='light'
                onClick={() => {
                    if(coverPhotoRef && coverPhotoRef.current){
                        coverPhotoRef.current.scrollIntoView({
                            behavior: 'smooth',
                            block: 'start'
                        })
                    }
                }}
            >return to top</Button>
        </div>
        
    )
}