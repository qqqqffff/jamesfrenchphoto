import { ComponentProps, useEffect, useRef, useState } from "react";

interface ProgressMetricProps extends ComponentProps<'div'> {
  currentAmount: number
}

export const ProgressMetric = (props: ProgressMetricProps) => {
  const [speed, setSpeed] = useState(0)
  const lastUploadedBytes = useRef(0)
  const lastUpdateTime = useRef(Date.now())

  useEffect(() => {
    const now = Date.now()
    const timeDiff = (now - lastUpdateTime.current) / 1000
    const bytesDiff = props.currentAmount - lastUploadedBytes.current


    if(timeDiff > 0) {
      const speed = (bytesDiff / 1024 / 1024) / timeDiff
      // console.log(timeDiff, bytesDiff, speed, new Date(lastUpdateTime.current), new Date(now))

      setSpeed(speed)
    }

    lastUploadedBytes.current = props.currentAmount
    lastUpdateTime.current = now
  }, [props.currentAmount])

  return (
    <div {...props}>
      <span>{speed.toFixed(2)} MB/s</span>
    </div>
  )
}