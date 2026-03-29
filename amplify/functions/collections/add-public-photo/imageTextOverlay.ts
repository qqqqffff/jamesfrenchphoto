import sharp from 'sharp'
import canvas from 'canvas'
import fs, { readdirSync } from 'node:fs'
// const fonts = require('fonts')

export async function addTextToImage(file: File, text: string) {
  try{
    canvas.registerFont('/opt/font/nodejs/fonts/arial.ttf', { family: 'arial' })
    console.log(readdirSync('/opt/font/nodejs/fonts'))

    const inputImage = await sharp(await file.arrayBuffer()).metadata()

    const defaultOptions = {
      fontSize: (inputImage.width ?? 320) / 10,
      textColor: 'black',
      backgroundColor: 'rgba(255,255,255,0.3)',
      paddingX: 20,
      paddingY: 10
    }

    const can = canvas.createCanvas(inputImage.width ?? 0, inputImage.height ?? 0)
    const ctx = can.getContext('2d')

    ctx.font = `${defaultOptions.fontSize}px arial`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    const textMetrics = ctx.measureText(text)
    const textWidth = textMetrics.width
    const textHieght = defaultOptions.fontSize

    ctx.clearRect(0, 0, can.width, can.height)

    ctx.fillStyle = defaultOptions.backgroundColor
    ctx.fillRect(
      ((inputImage.width ?? 0) - textWidth - defaultOptions.paddingX * 2) / 2,
      ((inputImage.height ?? 0) - textHieght - defaultOptions.paddingY * 2) / 2,
      textWidth + defaultOptions.paddingX * 2,
      textHieght + defaultOptions.paddingY * 2,
    )

    ctx.fillStyle = defaultOptions.textColor
    ctx.fillText(
      text,
      (inputImage.width ?? 0)/ 2,
      (inputImage.height ?? 0) / 2
    )

    const textOverlayBuffer = can.toBuffer('image/png')

    const finalFile = await sharp(await file.arrayBuffer())
      .composite([{
        input: textOverlayBuffer,
        top: 0,
        left: 0
      }])
      .toFormat('png')
      .toBuffer()


    return finalFile
  } catch(error){
    console.error(error)
  }
}