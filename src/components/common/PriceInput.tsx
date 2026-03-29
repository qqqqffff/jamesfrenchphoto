import { TextInput } from "flowbite-react"
import { textInputTheme } from "../../utils"
import { useEffect, useState } from "react"
import { priceFormatter } from "../../functions/packageFunctions"

interface PriceInputProps {
  value: string,
  discount?: string,
  updateState: (value: string) => void,
  disabled?: boolean
  className?: string
  displayDiscount?: boolean
  label?: JSX.Element
}

//TODO: put in a useeffect to destroy states
export const PriceInput = (props: PriceInputProps) => {
  const [isFocused, setIsFocused] = useState(false)
  const [formattedValue, setFormattedValue] = useState('')
  const [inprogressValue, setInprogressValue] = useState(props.value)

  const formatPrice = (val: string) => {
    if(!val) return ''

    const numericValue = parseFloat(val.replace(/[^\d.-]/g, ''))

    if(isNaN(numericValue)) return ''

    return `${priceFormatter.format(numericValue)}${props.displayDiscount ? ` (${priceFormatter.format(parseFloat(calculateDiscountedPrice(numericValue, props.discount ?? '')))})` : ''}`
  }

  const calculateDiscountedPrice = (price: number, discount: string): string => {
    // assuming price and discounts are floats stored as strings -> parsed into numbers for calculation
    
    const discountFloat = parseFloat(discount)
    if(isNaN(discountFloat)) return String(price)
    
    return priceFormatter.format((price * (1 - (discountFloat / 100))))
  }

  const handleFocus = () => setIsFocused(true)
  const handleBlur = () => {
    setIsFocused(false)
    setFormattedValue(formatPrice(props.value ?? ''))
    props.updateState(!isNaN(parseFloat(inprogressValue)) ? inprogressValue : props.value)
  }

  useEffect(() => {
    if(!isFocused) {
      setFormattedValue(formatPrice(props.value ?? ''))
    }
  }, [props.value, isFocused, props.discount])

  return (
    <div className="flex flex-row items-center gap-2">
      {props.label}
      <TextInput 
        theme={textInputTheme}
        sizing="sm"
        placeholder="$0.00"
        className={props.className ?? "min-w-[123px] max-w-[123px]"}
        value={isFocused ? inprogressValue : formattedValue === '$0.00' ? '' : formattedValue}
        onChange={(event) => {
          let value = event.target.value.replace(/[^\d.]/g, '')
          const numberParts = value.split('.')
          if(numberParts.length > 1) {
            value = numberParts[0] + '.' + numberParts[1].substring(0, 2)
          }
          setInprogressValue(value)
        }}
        disabled={props.disabled}
        onFocus={handleFocus}
        onBlur={handleBlur}
      />
    </div>
  )
}