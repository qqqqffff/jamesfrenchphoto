import { Dispatch, SetStateAction, useEffect, useRef, useState } from "react"
import invariant from 'tiny-invariant';


interface ColorWheelPickerProps {
  size: number;
  displaySelected?: boolean
  binding?: {
    setSelectedColor: Dispatch<SetStateAction<[string, string] | undefined>>
  }
}

export const ColorWheelPicker = (props: ColorWheelPickerProps) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [selectedColor, setSelectedColor] = useState('#ff0000');
  const size = props.size
  const centerX = size / 2;
  const centerY = size / 2
  const radius = size / 2 - 10;

  useEffect(() => {
    drawColorWheel();
  }, [])

  const drawColorWheel = () => {
    const canvas = canvasRef.current
    if(!canvas) return

    const ctx = canvas.getContext('2d')
    invariant(ctx)
    const imageData = ctx.createImageData(size, size)
    const data = imageData.data

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = x - centerX;
        const dy = y - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance <= radius) {
          const angle = Math.atan2(dy, dx);
          const hue = ((angle + Math.PI) / (2 * Math.PI)) * 360;
          const saturation = distance / radius;
          const value = 1;
          
          const rgb = hsvToRgb(hue, saturation, value);
          const index = (y * size + x) * 4;
          data[index] = rgb.r;
          data[index + 1] = rgb.g;
          data[index + 2] = rgb.b;
          data[index + 3] = 255;
        }
      }
    }

    ctx.putImageData(imageData, 0, 0)
  }

  const hsvToRgb = (h: number, s: number, v: number): { r: number, g: number, b: number } => {
    const c = v * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = v - c;
    
    let r, g, b;
    if (h < 60) { r = c; g = x; b = 0; }
    else if (h < 120) { r = x; g = c; b = 0; }
    else if (h < 180) { r = 0; g = c; b = x; }
    else if (h < 240) { r = 0; g = x; b = c; }
    else if (h < 300) { r = x; g = 0; b = c; }
    else { r = c; g = 0; b = x; }
    
    return {
      r: Math.round((r + m) * 255),
      g: Math.round((g + m) * 255),
      b: Math.round((b + m) * 255)
    };
  }

  const rgbToHex = (r: number, g: number, b: number) => {
    return '#' + [r, g, b].map(x => {
      const hex = x.toString(16)
      return hex.length === 1 ? '0' + hex : hex
    }).join('')
  }

  const hexToRgb = (hex: string): { r: number, g: number, b: number } | null => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null
  }

  const rgbToHsv = (r: number, g: number, b: number): { h: number, s: number, v: number } => {
    r /= 255
    g /= 255
    b /= 255

    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    const dif = max - min

    let h = 0
    if(dif !== 0) {
      if(max === r) h = 60 * (((g - b) / dif) % 6)
      else if(max === g) h = 60 * ((b - r) / dif + 2)
      else h = 60 * ((r - g) / dif + 4)
    }
    if (h < 0) h += 360

    const s = max === 0 ? 0 : dif / max
    const v =  max

    return {
      h,
      s,
      v
    }
  }

  const generateBackgroundColor = (primaryHex: string) => {
    const rgb = hexToRgb(primaryHex)
    if(!rgb) return '#ffffff'

    const hsv = rgbToHsv(rgb.r, rgb.g, rgb.b)

    const bgHsv = {
      h: hsv.h,
      s: hsv.s * 0.2,
      v: 0.95,
    }

    const bgRgb = hsvToRgb(bgHsv.h, bgHsv.s, bgHsv.v)
    return rgbToHex(bgRgb.r, bgRgb.g, bgRgb.b)
  }

  const getColorAtPosition = (x: number, y: number) => {
    const canvas = canvasRef.current
    if(canvas === null) return
    const rect = canvas.getBoundingClientRect()
    const canvasX = x - rect.left
    const canvasY = y - rect.top

    const dx = canvasX - centerX
    const dy = canvasY - centerY;
    const distance = Math.sqrt(dx * dx + dy * dy)

    if(distance <= radius) {
      const ctx = canvas.getContext('2d')
      invariant(ctx)
      const pixel = ctx.getImageData(canvasX, canvasY, 1, 1).data
      return rgbToHex(pixel[0], pixel[1], pixel[2])
    }
    return null
  }

  const updateColor = (x: number, y: number) => {
    const color = getColorAtPosition(x, y)
    if(color) {
      if(props.binding) {
        setSelectedColor(color)
        props.binding.setSelectedColor([color, generateBackgroundColor(color)])
      }
      else {
        setSelectedColor(color)
      }
    }
  }

  return (
    <div className="flex flex-col items-center gap-6">
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        onMouseDown={(e) => {
          updateColor(e.clientX, e.clientY)
          e.currentTarget
        }}
        className="cursor-crosshair rounded-lg shadow-md"
        style={{ touchAction: 'none' }}
      />
      
      {props.displaySelected && (
        <div className="flex flex-col gap-4 w-full max-w-md">
          <div className="flex items-center gap-4">
            <div
              className="w-10 h-10 rounded-lg shadow-md border-2 border-gray-200"
              style={{ backgroundColor: selectedColor }}
            />
            <div className="flex flex-col">
              <p className="text-sm text-gray-600">Selected Color</p>
              <p className="text-lg font-mono font-bold text-gray-800">
                {selectedColor}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}