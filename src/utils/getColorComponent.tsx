import { FC } from "react";
import { defaultColors } from ".";

export interface ColorComponentProps {
    activeColor?: string
    customText?: string
}

export const getColorComponent: FC<ColorComponentProps> = ({ activeColor, customText }) => {
    if(!activeColor && !customText){
        return (<span>Black</span>)
    }
    if(!activeColor) activeColor = 'black'

    const className = 'text-' + activeColor
    
    if(!(defaultColors.map((color) => ('text-' + color)).includes(className) || activeColor === 'black')){
        throw new Error('Unexpected Token')
    }
    
    const colorText = activeColor.replace(/[^a-zA-Z]/g, '')[0].toUpperCase() + activeColor.replace(/[^a-zA-Z]/g, '').substring(1);
    return (<span className={className}>{customText ? customText : colorText}</span>)
}