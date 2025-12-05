import { FC } from "react";
import { defaultColumnColors } from "../../utils";

export interface ColorComponentProps {
  activeColor?: string
  customText?: string
}

export const ColorComponent: FC<ColorComponentProps> = ({ activeColor, customText }) => {
  if(!activeColor && !customText){
    return (<span>Black</span>)
  }
  if(!activeColor) activeColor = 'black'
  
  
  const className = (defaultColumnColors[activeColor] !== undefined ? 
    `text-${defaultColumnColors[activeColor].text} bg-${defaultColumnColors[activeColor].bg}`
  : 'text-' + activeColor) + ' px-2 py-1'

  const colorText = activeColor.replace(/[^a-zA-Z]/g, '')[0].toUpperCase() + activeColor.replace(/[^a-zA-Z]/g, '').substring(1);

  return (
    <span 
      className={className}
    >{customText ? customText : colorText}</span>
  )
}