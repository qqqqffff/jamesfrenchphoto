import { ChangeEvent, Dispatch, SetStateAction, useState } from "react"
import { Package, PackageItem } from "../../types"
import { TextInput } from "flowbite-react"
import { textInputTheme } from "../../utils"

//TODO: make me more generic
interface PercentInputProps {
  item: PackageItem,
  selectedPackage: Package
  parentUpdatePackage: Dispatch<SetStateAction<Package | undefined>>
  parentUpdatePackageList: Dispatch<SetStateAction<Package[]>>
}

//TODO: put in a useeffect to destroy states
export const PercentInput = (props: PercentInputProps) => {
  const [isFocused, setIsFocused] = useState(false)
  const [formattedValue, setFormattedValue] = useState('')

  const formatPercent = (val: string) => {
    if(!val) return ''
    const numericValue = parseFloat(val.replace(/[^\d.-]/g, ''))
    if(isNaN(numericValue)) return ''

    return new Intl.NumberFormat('en-US', {
      style: 'percent',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numericValue / 100)
  }

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value.replace(/[^\d.]/g, '')

    const parts = inputValue.split('.')
    const sanitized = parts[0] + (parts.length > 1 ? '.' + parts.slice(1).join('') : '')

    const numericValue = parseFloat(sanitized)
    if(!isNaN(numericValue) && numericValue >= 0 && numericValue < 100) {
      const tempPackage: Package = {
        ...props.selectedPackage,
        items: props.selectedPackage.items.map((item) => (item.id === props.item.id ? ({
          ...props.item,
          discount: sanitized
        }) : item))
      }

      props.parentUpdatePackage(tempPackage)
      props.parentUpdatePackageList((prev) => prev.map((pack) => pack.id === tempPackage.id ? tempPackage : pack))
    }
    if(inputValue === '') {
      const tempPackage: Package = {
        ...props.selectedPackage,
        items: props.selectedPackage.items.map((item) => (item.id === props.item.id ? ({
          ...props.item,
          discount: ''
        }) : item))
      }

      props.parentUpdatePackage(tempPackage)
      props.parentUpdatePackageList((prev) => prev.map((pack) => pack.id === tempPackage.id ? tempPackage : pack))
    }
  }

  const handleFocus = () => setIsFocused(true)
  const handleBlur = () => {
    setIsFocused(false)
    setFormattedValue(formatPercent(props.item.discount ?? ''))
  }

  return (
    <div className="flex flex-row items-center gap-2">
      <span className="text-lg font-light italic">Discount:</span>
      <TextInput 
        theme={textInputTheme}
        sizing="sm"
        placeholder="00.00%"
        className="min-w-[94px] max-w-[94px]"
        value={isFocused ? props.item.discount : formattedValue}
        onChange={handleInputChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        disabled={props.item.price === undefined || props.item.price === ''}
      />
    </div>
  )
}