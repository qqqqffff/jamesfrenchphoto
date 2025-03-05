import { useQuery } from "@tanstack/react-query"
import { PhotoCollection } from "../../../types"
import { getPathQueryOptions } from "../../../services/collectionService"

interface SharePreviewProps {
  collection: PhotoCollection,
  header?: string,
  header2?: string,
  body?: string,
  footer?: string,
}


export const SharePreview = (props: SharePreviewProps) => {
  const coverPath = useQuery(getPathQueryOptions(props.collection.coverPath ?? ''))

  function transformText(value: string){
    const split = value.split('\n')
    return split.map((value, key) => {
      return (
        <span key={key} className="inline-block w-full whitespace-normal break-words">
          {value}
          <br />
        </span>
      )
    })
  }

  return (
    <div className="flex flex-col items-center gap-2 w-[500px]">
      <span className="font-light italic text-lg">Preview</span>
      <div className="rounded-lg border flex flex-col w-full">
        <div className="px-4 py-2 bg-black rounded-t-lg justify-center flex">
          <span className="text-white text-lg">James French Photography</span>
        </div>
        <div className="px-6 py-4 gap-4 flex flex-col text-white bg-[#85c1e9]">
          <span className={`text-2xl text-white ${props.header ? 'font-semibold' : 'font-light italic'}`}>{transformText(props.header ? props.header : 'Header will display here')}</span>
          <span className={`text-lg text-white ${props.header2 ? '' : 'font-light italic'}`}>{transformText(props.header2 ? props.header2 : 'Header2 will display here')}</span>
        </div>
        <div className="flex justify-center items-center relative w-full px-4">
          <img src={coverPath.data?.[1]} className="w-full"/>
          <div className="bg-white px-4 py-2 bg-opacity-30 absolute">
            <span className="text-5xl text-black opacity-100" >{props.collection.name}</span>
          </div>
        </div>
        <div className="px-2 text-[#2874a6] flex flex-col gap-4 py-4">
          <span className={`px-4 text-lg text-[#2874a6] ${props.body ? '' : 'font-light italic'}`}>{transformText(props.body ? props.body : 'Body will display here')}</span>
          <span className={`px-4 text-[#2874a6] ${props.footer ? '' : 'font-light italic'}`}>{transformText(props.header ? props.header : 'Footer will display here')}</span>
          <div className=" rounded-full border-2 border-[#2874a6]"></div>
          <p className="px-4 text-[#2874a6] mb-4 hover:cursor-pointer">
            <u>View Collection Here</u>
          </p>
        </div>
      </div>
    </div>
  )
}