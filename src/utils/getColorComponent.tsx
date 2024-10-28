import { FC } from "react";
import { defaultColors } from ".";

export interface ColorComponentProps {
    activeColor: string | undefined
}

export const getColorComponent: FC<ColorComponentProps> = ({ activeColor }) => {
    if(!activeColor){
        return (<span>None</span>)
    }

    const className = 'text-' + activeColor
    
    if(!defaultColors.map((color) => ('text-' + color)).includes(className)){
        throw new Error('Unexpected Token')
    }
    
    const colorText = activeColor.replace(/[^a-zA-Z]/g, '')[0].toUpperCase() + activeColor.replace(/[^a-zA-Z]/g, '').substring(1);
    return (<span className={className}>{colorText}</span>)
}