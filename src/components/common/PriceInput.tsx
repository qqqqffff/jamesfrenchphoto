import { TextInput } from "flowbite-react"
import { textInputTheme } from "../../utils"
import { Package, PackageItem } from "../../types"
import { ChangeEvent, Dispatch, SetStateAction, useEffect, useState } from "react"

//TODO: make me more generic
interface PriceInputProps {
  item: PackageItem
  selectedPackage: Package,
  parentUpdatePackage: Dispatch<SetStateAction<Package | undefined>>
  parentUpdatePackageList: Dispatch<SetStateAction<Package[]>>
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

    
    return `${priceFormatter.format(numericValue)} (${calculateDiscountedPrice(numericValue, props.item.discount ?? '')})`
  }

  const calculateDiscountedPrice = (price: number, discount: string): string => {
    // assuming price and discounts are floats stored as strings -> parsed into numbers for calculation
    
    const discountFloat = parseFloat(discount)
    if(isNaN(discountFloat)) return String(price)
    
    return priceFormatter.format((price * (1 - (discountFloat / 100))))
  }

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value.replace(/[^\d.]/g, '')

    const parts = inputValue.split('.')
    const sanitized = parts[0] + (parts.length > 1 ? '.' + parts.slice(1).join('') : '')
    
    const numericValue = parseFloat(sanitized)
    if(!isNaN(numericValue)) {
      const tempPackage: Package = {
        ...props.selectedPackage,
        items: props.selectedPackage.items.map((item) => (item.id === props.item.id ? ({
          ...props.item,
          price: sanitized
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
          price: ''
        }) : item))
      }

      props.parentUpdatePackage(tempPackage)
      props.parentUpdatePackageList((prev) => prev.map((pack) => pack.id === tempPackage.id ? tempPackage : pack))
    }
  }

  const handleFocus = () => setIsFocused(true)
  const handleBlur = () => {
    setIsFocused(false)
    setFormattedValue(formatPrice(props.item.price ?? ''))
  }

  useEffect(() => {
    if(!isFocused) {
      setFormattedValue(formatPrice(props.item.price ?? ''))
    }
  }, [props.item.price, isFocused, props.item.discount])

  return (
    <div className="flex flex-row items-center gap-2">
      <span className="text-lg font-light italic">Price:</span>
      <TextInput 
        theme={textInputTheme}
        sizing="sm"
        placeholder="$0.00"
        className="min-w-[123px] max-w-[123px]"
        value={isFocused ? props.item.price : formattedValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
      />
    </div>
  )
}