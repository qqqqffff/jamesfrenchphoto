import { FC, useState } from "react";
import { HiOutlineChevronDown, HiOutlineChevronRight } from 'react-icons/hi'

interface DropdownMenuProps {
    heading: JSX.Element
    inlineHeading?: JSX.Element
    items: JSX.Element[]
    initialState?: boolean
}

export const DropdownMenu: FC<DropdownMenuProps> = ({ heading, inlineHeading, items, initialState }) => {
    const [display, setDisplay] = useState(initialState ?? false)

    return (
        <div className="flex flex-col gap-2">
            <div className="flex flex-row">
                <div className="flex flex-row">
                    <button 
                        className='flex flex-row items-center border-b border-b-gray-300 px-2 hover:text-gray-600' 
                        onClick={() => setDisplay(!display)}
                    >
                        {heading}
                        {display ? (<HiOutlineChevronDown className="ms-3" />) : (<HiOutlineChevronRight className="ms-3" />)}
                    </button>
                    {inlineHeading}
                </div>
                
            </div>
            {display ? (
                <>
                    {items}
                </>
            ) : (
                <></>
            )}
        </div>
    )
}