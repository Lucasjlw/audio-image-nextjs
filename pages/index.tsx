import { useCallback, useRef } from "react"

const ImagePage = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const generators: Object = {
    generateImageFromAudioBuffer(decodedAudioBuffer: AudioBuffer): void {
      if (!canvasRef.current) return

      const canvas: HTMLCanvasElement | null = canvasRef.current

      const ctx: CanvasRenderingContext2D | null = canvas.getContext("2d")
      if (!ctx) return

      const channelData: Float32Array = decodedAudioBuffer.getChannelData(0)

      const canvasWidth: number = canvas.width
      const canvasHeight: number = canvas.height

      const imageData: ImageData = ctx.createImageData(canvasWidth, canvasHeight)

      normalizeDataToRange(channelData, 0, 255)

      for (let i = 0; i < imageData.data.length; i++) {
        const value: number = channelData[i]
        const index: number = i * 4

        imageData.data[index] = value
        imageData.data[index + 1] = value
        imageData.data[index + 2] = value
        imageData.data[index + 3] = 255
      }

      ctx.putImageData(imageData, 0, 0)

      downloadCanvasImage()
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

        const channelData: Float32Array = new Float32Array(imageData.data.length / 4)

        for (let i = 0; i < imageData.data.length; i++) {
          const index: number = i * 4
          const value: number = imageData.data[index]

          channelData[i] = value
        }

        console.log(channelData)

        normalizeDataToRange(channelData, -1, 1)

        console.log(channelData)

        playAudioInArray(channelData)
      }
    }
  }

  function normalizeDataToRange(array: Float32Array, a: number, b: number): void {
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
  }

  function downloadCanvasImage(): void {
    if (!canvasRef.current) return
    const canvas = canvasRef.current

    var link = document.createElement('a');
    link.download = 'filename.tiff';
    link.href = canvas.toDataURL()
    link.click();
  }

  function playAudioInArray(array: Float32Array): void {
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
  }

  const handleUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>): void => {
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
  }, [])

  return (
    <div>
      <h1>Image</h1>

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