import { useLoaderData, useNavigate } from "react-router-dom"
import { useEffect, useRef, useState } from "react"
import { Button } from "flowbite-react"
import { PicturePath } from "../../types"

export const CollectionViewer = () => {
    const coverPath = 
        {url: 'https://placehold.co/800x800'}
    const collection = useLoaderData() as PicturePath
    console.log(collection)
    const navigate = useNavigate()
    const coverPhotoRef = useRef<HTMLImageElement | null>(null)
    // const [photos, setPhotos] = useState<PicturePath[] | undefined>()
    const navigateControls = history.state && history.state.usr && history.state.usr.origin === 'admin'
    const innerWindowHeight = window.innerHeight + 'px'
    const [coverPhoto, setCoverPhoto] = useState((<img ref={coverPhotoRef} src={coverPath.url} className={`object-cover w-full max-h-[${innerWindowHeight}]`}/>))
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
    return (
        <div className="font-main">
            <div className="flex flex-row justify-center mb-10">
                <Button color='light' onClick={() => navigate(`/${navigateControls ? 'admin' : 'client'}/dashboard`)}>{navigateControls ? 'Return to Admin Console' : 'Return Home'}</Button>
            </div>
            <div className="border border-black flex-row justify-center mb-2 relative">
                <div className="absolute flex flex-col inset-0 place-self-center items-center justify-center">
                    <p className="md:text-6xl sm:text-3xl font-thin">Test collection</p>
                    <p className="italic md:text-4xl">{new Date().toLocaleDateString()}</p>
                </div>
                {coverPhoto}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mx-4">
                <div className="flex flex-col gap-4">
                    <div className="col-span-2">
                        <img className="h-auto max-w-full rounded-lg" src='https://placehold.co/600x800' alt="" />
                    </div>
                    <div>
                        <img className="h-auto max-w-full rounded-lg" src="https://flowbite.s3.amazonaws.com/docs/gallery/masonry/image-1.jpg" alt="" />
                    </div>
                    <div>
                        <img className="h-auto max-w-full rounded-lg" src="https://flowbite.s3.amazonaws.com/docs/gallery/masonry/image-2.jpg" alt="" />
                    </div>
                    <div>
                        <img className="h-auto max-w-full rounded-lg" src="https://flowbite.s3.amazonaws.com/docs/gallery/masonry/image-2.jpg" alt="" />
                    </div>
                </div>
                <div className="flex flex-col gap-4">
                    <div>
                        <img className="h-auto max-w-full rounded-lg" src="https://flowbite.s3.amazonaws.com/docs/gallery/masonry/image-3.jpg" alt="" />
                    </div>
                    <div>
                        <img className="h-auto max-w-full rounded-lg" src="https://flowbite.s3.amazonaws.com/docs/gallery/masonry/image-4.jpg" alt="" />
                    </div>
                    <div>
                        <img className="h-auto max-w-full rounded-lg" src="https://flowbite.s3.amazonaws.com/docs/gallery/masonry/image-5.jpg" alt="" />
                    </div>
                </div>
                <div className="flex flex-col gap-4">
                    <div>
                        <img className="h-auto max-w-full rounded-lg" src="https://flowbite.s3.amazonaws.com/docs/gallery/masonry/image-6.jpg" alt="" />
                    </div>
                    <div>
                        <img className="h-auto max-w-full rounded-lg" src="https://flowbite.s3.amazonaws.com/docs/gallery/masonry/image-7.jpg" alt="" />
                    </div>
                    <div>
                        <img className="h-auto max-w-full rounded-lg" src="https://flowbite.s3.amazonaws.com/docs/gallery/masonry/image-8.jpg" alt="" />
                    </div>
                </div>
                <div className="flex flex-col gap-4">
                    <div>
                        <img className="h-auto max-w-full rounded-lg" src="https://flowbite.s3.amazonaws.com/docs/gallery/masonry/image-9.jpg" alt="" />
                    </div>
                    <div>
                        <img className="h-auto max-w-full rounded-lg" src="https://flowbite.s3.amazonaws.com/docs/gallery/masonry/image-10.jpg" alt="" />
                    </div>
                    <div>
                        <img className="h-auto max-w-full rounded-lg" src="https://flowbite.s3.amazonaws.com/docs/gallery/masonry/image-11.jpg" alt="" />
                    </div>
                </div>
                <div className="flex flex-col gap-4">
                    <div>
                        <img className="h-auto max-w-full rounded-lg" src="https://flowbite.s3.amazonaws.com/docs/gallery/masonry/image-9.jpg" alt="" />
                    </div>
                    <div>
                        <img className="h-auto max-w-full rounded-lg" src="https://flowbite.s3.amazonaws.com/docs/gallery/masonry/image-10.jpg" alt="" />
                    </div>
                    <div>
                        <img className="h-auto max-w-full rounded-lg" src="https://flowbite.s3.amazonaws.com/docs/gallery/masonry/image-11.jpg" alt="" />
                    </div>
                </div>
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