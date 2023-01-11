import { useCallback, useRef } from "react"

const ImagePage = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const normalizeDataToRange = useCallback((array: Float32Array, a: number, b: number): void => {
    let min: number = 0
    let max: number = 0
    for (let i = 0; i < array.length; i++) {
      if (array[i] < min) min = array[i]
      if (array[i] > max) max = array[i]
    }

    const lowerMinusHigher: number = b - a
    for (let i = 0; i < array.length; i++) {
      array[i] = a + (lowerMinusHigher * (array[i] - min)) / (max - min)
    }
  }, [])

  const downloadObject = useCallback((url: string, filetype: string): void => {
    var link = document.createElement('a');
    link.download = 'filename.' + filetype;
    link.href = url
    link.click();
  }, [])

  const playAudioInArray = useCallback((array: Float32Array): void => {
    const audioContext: AudioContext = new AudioContext()

    const audioBuffer: AudioBuffer = audioContext.createBuffer(1, array.length, audioContext.sampleRate)

    audioBuffer.copyToChannel(array, 0)

    const audioBufferSourceNode: AudioBufferSourceNode = audioContext.createBufferSource()

    audioBufferSourceNode.buffer = audioBuffer

    const gainNode: GainNode = audioContext.createGain()

    gainNode.gain.value = 0.5

    audioBufferSourceNode.connect(gainNode)

    gainNode.connect(audioContext.destination)

    audioBufferSourceNode.start()
  }, [])

  const handleUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>): void => {
    const generators = {
      generateImageFromAudioBuffer(decodedAudioBuffer: AudioBuffer): void {
        if (!canvasRef.current) return
  
        const canvas: HTMLCanvasElement | null = canvasRef.current
  
        const ctx: CanvasRenderingContext2D | null = canvas.getContext("2d")
        if (!ctx) return
  
        const channelData: Float32Array = decodedAudioBuffer.getChannelData(0)
  
        const canvasWidth: number = canvas.width
        const canvasHeight: number = canvas.height
  
        const imageData: ImageData = ctx.createImageData(canvasWidth, canvasHeight)

        const numberOfNumeralGroupsNotFirst: number = 2
        const extractedNumeralsFirst: Float32Array = new Float32Array(channelData.length)
        const extractedNumeralsNotFirst: Float32Array = new Float32Array(channelData.length * numberOfNumeralGroupsNotFirst)

        for (let i = 0; i < channelData.length; i++) {
          const channelDataValue: number = channelData[i] * 255
          const valueMul100AsString: string = channelDataValue.toString()
          const splitDataValueByDecimal: string[] = valueMul100AsString.split(".")

          const firstThreeNumerals: number = parseInt(splitDataValueByDecimal[0])
          const nextThreeNumerals: number = parseInt(splitDataValueByDecimal[1].slice(0, 3))
          const lastThreeNumerals: number = parseInt(splitDataValueByDecimal[1].slice(3, 6))

          extractedNumeralsFirst[i] = firstThreeNumerals
          extractedNumeralsNotFirst[i] = nextThreeNumerals
          extractedNumeralsNotFirst[i + 1] = lastThreeNumerals
        }

        normalizeDataToRange(extractedNumeralsNotFirst, 0, 255)

        for (let i = 0; i < extractedNumeralsFirst.length; i++) {
          const imageDataIndex: number = i * 4
          const notFirstIndex: number = i * 2

          const firstThreeNumerals: number = extractedNumeralsFirst[i]
          const nextThreeNumerals: number = extractedNumeralsNotFirst[notFirstIndex]
          const lastThreeNumerals: number = extractedNumeralsNotFirst[notFirstIndex + 1]

          imageData.data[imageDataIndex] = firstThreeNumerals
          imageData.data[imageDataIndex + 1] = nextThreeNumerals
          imageData.data[imageDataIndex + 2] = lastThreeNumerals
          imageData.data[imageDataIndex + 3] = 255
        }
  
        ctx.putImageData(imageData, 0, 0)
  
        const imageDataUrl: string = canvas.toDataURL()
        downloadObject(imageDataUrl, "png")
      },
  
      generateAudioFromImage(file: File): void {
        if (!canvasRef.current) return
  
        const canvas: HTMLCanvasElement = canvasRef.current
        const ctx: CanvasRenderingContext2D | null = canvas.getContext("2d")
        if (!ctx) return
  
        const image: HTMLImageElement = new Image()
        image.src = URL.createObjectURL(file)
  
        image.onload = () => {
          canvas.width = image.width
          canvas.height = image.height
  
          ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
  
          const imageData: ImageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  
          const rgbaLength: number = 4
          const channelData: Float32Array = new Float32Array(imageData.data.length / rgbaLength)

          const numberOfNumeralGroupsNotFirst: number = 2
          const extractedNumeralsFirst: Float32Array = new Float32Array(channelData.length)
          const extractedNumeralsNotFirst: Float32Array = new Float32Array(channelData.length * numberOfNumeralGroupsNotFirst)

          for (let i = 0; i < channelData.length; i++) {
            const indexForImageData: number = i * 4
            const indexForNotFirst: number = i * 2

            const firstThreeNumerals: number = imageData.data[indexForImageData]
            const nextThreeNumerals: number = imageData.data[indexForImageData + 1]
            const lastThreeNumerals: number = imageData.data[indexForImageData + 2]

            extractedNumeralsFirst[i] = firstThreeNumerals
            extractedNumeralsNotFirst[indexForNotFirst] = nextThreeNumerals
            extractedNumeralsNotFirst[indexForNotFirst + 1] = lastThreeNumerals
          }

          normalizeDataToRange(extractedNumeralsNotFirst, 0, 999)

          for (let i = 0; i < extractedNumeralsFirst.length; i++) {
            const indexForNotFirst: number = i * 2

            const firstThreeNumerals: number = extractedNumeralsFirst[i]
            const nextThreeNumerals: number = extractedNumeralsNotFirst[indexForNotFirst]
            const lastThreeNumerals: number = extractedNumeralsNotFirst[indexForNotFirst + 1]

            const combinedNumeralsAsString: string = `${firstThreeNumerals}.${nextThreeNumerals}${lastThreeNumerals}`

            const combinedNumeralsAsFloat: number = parseFloat(combinedNumeralsAsString)

            channelData[i] = combinedNumeralsAsFloat / 255
          }
  
          playAudioInArray(channelData) 
        }
      }
    }
    
    const handleImageUpload = (file: File) => {
      generators.generateAudioFromImage(file)
    }

    const handleAudioUpload = async (file: File) => {
      const audioContext: AudioContext = new AudioContext()

      if (!audioContext) return

      const arrayBuffer: ArrayBuffer = await file.arrayBuffer()

      const decodedAudioBuffer: AudioBuffer = await audioContext.decodeAudioData(arrayBuffer)

      generators.generateImageFromAudioBuffer(decodedAudioBuffer)
    }

    if (!e.target.files?.[0]) return
    const file: File = e.target.files[0]

    if (file.type.includes("image")) handleImageUpload(file)

    else if (file.type.includes("audio")) handleAudioUpload(file)
  }, [normalizeDataToRange, playAudioInArray, downloadObject])

  return (
    <div>
      <h1 className="mb-8">Audio-Image Transducer</h1>

      <ul className="list-disc mb-8">
        <li>Upload an image or audio file</li>
        <li>If you upload an image, you will hear that image as audio</li>
        <li>If you upload audio, you will receive that audio as an image</li>
        <li>Download your audio files and edit them, and then upload them! See what changes!</li>
      </ul>

      <input
        type="file"
        accept="audio/*,image/*"
        onChange={handleUpload}
      />

      <canvas ref={canvasRef} id="canvas" width="500" height="500" className="border mt-8" />
    </div>
  )
}

export default ImagePage