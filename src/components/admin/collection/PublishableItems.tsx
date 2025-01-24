import { HiOutlineExclamationTriangle } from "react-icons/hi2";

interface PublishableItemsProps {
  item: 'error' | 'warning', 
  message: string
}

export const PublishableItems = (props: PublishableItemsProps) => {
  return (
    <div className={`flex flex-row items-center gap-1 ${props.item === 'warning' ? 'text-yellow-500' : 'text-red-500'}`}>
      <HiOutlineExclamationTriangle size={20}/>
      <span>{props.message}</span>
    </div>
  )
}