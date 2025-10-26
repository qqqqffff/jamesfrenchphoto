import { UseQueryResult } from "@tanstack/react-query"
import { PicturePath } from "../../types"
import { useCallback, useEffect, useRef, useState } from "react"

interface PictureItemProps {
  picture: PicturePath
  watermarkPath?: string
  watermarkQuery: UseQueryResult<[string | undefined, string] | undefined, Error> | undefined
}

export const PictureItem = (props: PictureItemProps) => {
  const [picDimensions, setPicDimensions] = useState({
    startX: 0,
    startY: 0,
    startWidth: 0,
    startHeight: 0
  })
  const [closing, setClosing] = useState(false)
  const [expanded, setExpanded] = useState<string>()
  const expandedRef = useRef<HTMLDivElement | null>(null)
  const expandedImageRef = useRef<HTMLImageElement | null>(null)
  const expandedWatermarkRef = useRef<HTMLImageElement | null>(null)
  const [expandedDimensions, setExpandedDimensions] = useState<number>()
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  const handleLongPress = useCallback((id: string) => {
    timeoutRef.current = setTimeout(() => {
      handleExpand(id)
    }, 300)
  }, [])

  const handleEndLongPress = useCallback(() => {
    if(timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }, [])

  const handleClose = (id: string) => {
    setClosing(true)

    const picture = picturesRef.current.get(id)
    setTimeout(() => {
      setExpanded(undefined)
      setClosing(false)
      picture?.focus()
    }, 300)
  }

  const handleExpand = (id: string) => {
    const picture = picturesRef.current.get(id)
    if(picture) {
      console.log('expanding')
      const thumbRect = picture.getBoundingClientRect()

      setPicDimensions({
        startX: thumbRect.left,
        startY: thumbRect.top,
        startWidth: thumbRect.width,
        startHeight: thumbRect.height
      })

      setExpanded(id)
      setClosing(false)
    }
  }

  useEffect(() => {
    if(expanded && expandedImageRef.current && expandedRef.current) {
      const expandedRect = expandedImageRef.current.getBoundingClientRect()
      const containerRect = expandedRef.current.getBoundingClientRect()

      const thumbnailCenterX = picDimensions.startX + picDimensions.startWidth / 2
      const thumbnailCenterY = picDimensions.startY + picDimensions.startHeight / 2
      const expandedCenterX = containerRect.left + containerRect.width / 2
      const expandedCenterY = containerRect.top + containerRect.height / 2

      const translateX = thumbnailCenterX - expandedCenterX
      const translateY = thumbnailCenterY - expandedCenterY

      const scaleX = picDimensions.startWidth / expandedRect.width
      const scaleY = picDimensions.startHeight / expandedRect.height

      const scale = Math.min(scaleX, scaleY)

      if(!closing) {
        expandedRef.current.style.transition = 'none'
        expandedRef.current.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`
        expandedRef.current.style.opacity = '0.7'

        expandedRef.current.offsetWidth

        expandedRef.current.style.transition = 'transform 300ms ease-out, opacity 300ms ease-out'
        expandedRef.current.style.transform = 'translate(0,0) scale(1)'
        expandedRef.current.style.opacity = '1'
      }
      else {
        expandedRef.current.style.transform = `translate(${translateX}px, ${translateY}px) scale({${scale}})`
        expandedRef.current.style.opacity = '0.7'
      }
    }
  })
}