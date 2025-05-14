import { TextInput } from "flowbite-react"
import { textInputTheme } from "../../utils"
import { ChangeEvent, useEffect, useState } from "react"

interface PriceInputProps {
  value: string,
  discount?: string,
  updateState: (value: string) => void,
  className?: string
  displayDiscount?: boolean
  label?: JSX.Element
}

const priceFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
})
//TODO: put in a useeffect to destroy states
export const PriceInput = (props: PriceInputProps) => {
  const [isFocused, setIsFocused] = useState(false)
  const [formattedValue, setFormattedValue] = useState('')

  const formatPrice = (val: string) => {
    if(!val) return ''

    const numericValue = parseFloat(val.replace(/[^\d.-]/g, ''))


    if(isNaN(numericValue)) return ''

    return `${priceFormatter.format(numericValue)}${props.displayDiscount ? ` (${calculateDiscountedPrice(numericValue, props.discount ?? '')}` : ''}`
  }

  const calculateDiscountedPrice = (price: number, discount: string): string => {
    // assuming price and discounts are floats stored as strings -> parsed into numbers for calculation
    
    const discountFloat = parseFloat(discount)
    if(isNaN(discountFloat)) return String(price)
    
    return priceFormatter.format((price * (1 - (discountFloat / 100))))
  }

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value.charAt(0) === '0' ? e.target.value.slice(1) : e.target.value

    const parts = inputValue.split('.')
    const sanitized = parts[0] + (parts.length > 1 ? '.' + parts.slice(1).join('') : '')
    
    const numericValue = parseFloat(sanitized)
    if(!isNaN(numericValue)) {
      props.updateState(sanitized)
    }

    if(inputValue === '') {
      props.updateState('0')
    }
  }

  const handleFocus = () => setIsFocused(true)
  const handleBlur = () => {
    setIsFocused(false)
    setFormattedValue(formatPrice(props.value ?? ''))
  }

  useEffect(() => {
    if(!isFocused) {
      setFormattedValue(formatPrice(props.value ?? ''))
    }
  }, [props.value, isFocused, props.discount])

  return (
    <div className="flex flex-row items-center gap-2">
      {/* <span className="text-lg font-light italic">Price:</span> */}
      <TextInput 
        theme={textInputTheme}
        sizing="sm"
        placeholder="$0.00"
        className={props.className ?? "min-w-[123px] max-w-[123px]"}
        value={isFocused ? props.value : formattedValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
      />
    </div>
  )
}