import { Button } from "flowbite-react";
import { FC } from "react";


export type ControlComponentProps = {
    name: string | JSX.Element;
    fn: Function;
    disabled?: boolean;
    type?: boolean;
    className?: string;
    isProcessing?: boolean
}
export const ControlComponent: FC<ControlComponentProps> = ({name, fn, disabled, type, className, isProcessing}) => {
    if(type){
        return (
            <Button 
                color='light'
                isProcessing={isProcessing} 
                className={className + `  flex flex-row items-center ps-2 py-1 rounded-3xl cursor-pointer disabled:text-gray-400 disabled:hover:bg-transparent disabled:cursor-not-allowed`} 
                disabled={disabled} 
                onClick={() => {fn()}}
            >
                {name}
            </Button>
        )
    }
    return (
        <Button
            color='light'
            isProcessing={isProcessing} 
            className={className + ` flex flex-row w-[80%] justify-center disabled:hover:bg-transparent disabled:text-gray-400 rounded-3xl py-2 border disabled:border-gray-400 disabled:cursor-not-allowed border-black`}  
            onClick={() => {fn()}}
            disabled={disabled}
        >
            {name}
        </Button>
    )
}