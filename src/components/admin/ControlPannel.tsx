import { FC } from "react";


export type ControlComponentProps = {
    name: string;
    fn: Function;
    disabled?: boolean;
}
export const ControlComponent: FC<ControlComponentProps> = ({name, fn, disabled}) => {
    return (
        <button
            className="flex flex-row w-[80%] justify-center hover:bg-gray-100 disabled:hover:bg-transparent disabled:text-gray-400 rounded-3xl py-2 border disabled:border-gray-400 border-black"  
            onClick={() => {fn()}}
            disabled={disabled}
        >
                {name}
        </button>
    )
}