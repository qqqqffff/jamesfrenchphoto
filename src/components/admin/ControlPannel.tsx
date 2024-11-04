import { FC } from "react";


export type ControlComponentProps = {
    name: string | JSX.Element;
    fn: Function;
    disabled?: boolean;
    type?: boolean;
    className?: string;
}
export const ControlComponent: FC<ControlComponentProps> = ({name, fn, disabled, type, className}) => {
    if(type){
        return (
            <button className={`flex flex-row items-center hover:bg-gray-100 ps-2 py-1 rounded-3xl cursor-pointer disabled:text-gray-400 disabled:hover:bg-transparent disabled:cursor-not-allowed` + className} disabled={disabled} onClick={() => {fn()}}>
                {name}
            </button>
        )
    }
    return (
        <button
            className={`flex flex-row w-[80%] justify-center hover:bg-gray-100 disabled:hover:bg-transparent disabled:text-gray-400 rounded-3xl py-2 border disabled:border-gray-400 disabled:cursor-not-allowed border-black`}  
            onClick={() => {fn()}}
            disabled={disabled}
        >
            {name}
        </button>
    )
}