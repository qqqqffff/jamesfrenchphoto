import { 
  ComponentProps, 
  // useEffect, 
  useRef, 
  // useState 
} from "react"

//TODO: fix me please
export const LazyImage = (props: ComponentProps<'img'>) => {
  const imgRef = useRef(null)
  // const [isVisible, setIsVisible] = useState(false)

  // useEffect(() => {
  //   const observer = new IntersectionObserver(([entry]) => {
  //     if(entry.isIntersecting) {
  //       setIsVisible(true)
  //       observer.disconnect()
  //     }
  //   }, { threshold: 0.1 })

  //   if(imgRef.current) {
  //     observer.observe(imgRef.current)
  //   }

  //   return () => {
  //     if(imgRef.current) {
  //       observer.disconnect()
  //     }
  //   }
  // })

  return (
    <div
      ref={imgRef}
    >
      {/* {isVisible ? ( */}
        <img 
          {...props}
        />
      {/* ) : (
         <div className="flex items-center justify-center w-[200px] h-[300px] bg-gray-300 rounded sm:w-96">
           <svg className="w-10 h-10 text-gray-200" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 18">
             <path d="M18 0H2a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2Zm-5.5 4a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Zm4.376 10.481A1 1 0 0 1 16 15H4a1 1 0 0 1-.895-1.447l3.5-7A1 1 0 0 1 7.468 6a.965.965 0 0 1 .9.5l2.775 4.757 1.546-1.887a1 1 0 0 1 1.618.1l2.541 4a1 1 0 0 1 .028 1.011Z"/>
           </svg>
         </div>
       )} */}
    </div>
  )
}