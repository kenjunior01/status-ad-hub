import { useState, useRef, useCallback, useEffect } from 'react'

// ============================================
// Hook: useAudioRecorder
// ============================================
// Gerencia gravação de áudio durante emergências
// usando a API MediaRecorder. Grava do microfone
// (no celular sempre disponível; óculos com mic
// podem ser usados como fonte alternativa).

interface RecordingState {
  isRecording: boolean
  /** Duração da gravação em segundos */
  duration: number
  blob: Blob | null
  /** URL de objeto para reprodução */
  url: string | null
  error: string | null
}

export function useAudioRecorder(maxDuration: number = 120) {
  const [state, setState] = useState<RecordingState>({
    isRecording: false,
    duration: 0,
    blob: null,
    url: null,
    error: null,
  })

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const maxDurationRef = useRef(maxDuration)

  // Manter maxDuration atualizado na ref
  useEffect(() => {
    maxDurationRef.current = maxDuration
  }, [maxDuration])

  const startRecording = useCallback(async () => {
    try {
      // Solicitar acesso ao microfone
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: false,   // Capturar áudio ambiente como evidência
          noiseSuppression: false,   // Preservar áudio original
          autoGainControl: true,
        },
      })
      streamRef.current = stream

      // Usar o melhor codec disponível
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/ogg;codecs=opus'

      const recorder = new MediaRecorder(stream, {
        mimeType,
        audioBitsPerSecond: 16000, // 16kbps — boa qualidade, arquivo pequeno
      })

      chunksRef.current = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType })
        const url = URL.createObjectURL(blob)
        setState((prev) => ({ ...prev, isRecording: false, blob, url }))
        // Parar todas as tracks do stream
        stream.getTracks().forEach((t) => t.stop())
        streamRef.current = null
      }

      recorder.onerror = () => {
        setState((prev) => ({ ...prev, isRecording: false, error: 'Erro na gravação' }))
        stream.getTracks().forEach((t) => t.stop())
        streamRef.current = null
      }

      // Coletar dados a cada 1 segundo
      recorder.start(1000)
      mediaRecorderRef.current = recorder

      setState({
        isRecording: true,
        duration: 0,
        blob: null,
        url: null,
        error: null,
      })

      // Contador de duração
      let seconds = 0
      timerRef.current = setInterval(() => {
        seconds++
        setState((prev) => ({ ...prev, duration: seconds }))
        // Parar automaticamente ao atingir duração máxima
        if (seconds >= maxDurationRef.current) {
          if (mediaRecorderRef.current?.state === 'recording') {
            mediaRecorderRef.current.stop()
          }
          if (timerRef.current) {
            clearInterval(timerRef.current)
            timerRef.current = null
          }
        }
      }, 1000)
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : 'Microfone indisponível'
      setState((prev) => ({ ...prev, error: message }))
    }
  }, [])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop()
    }
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  // Limpeza ao desmontar o componente
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.stop()
      }
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
        streamRef.current = null
      }
      // Revogar URL de objeto se existir
      // Nota: não podemos acessar `state.url` aqui de forma reativa,
      // mas a URL será revogada em reset() ou quando nova gravação iniciar
    }
  }, [])

  /** Converte o blob gravado para base64 (data URL) */
  const getBase64 = useCallback(async (): Promise<string | null> => {
    if (!state.blob) return null
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(state.blob!)
    })
  }, [state.blob])

  /** Inicia download do áudio gravado */
  const download = useCallback(
    (filename?: string) => {
      if (!state.blob || !state.url) return
      const a = document.createElement('a')
      a.href = state.url
      a.download =
        filename ||
        `evidencia-audio-${new Date().toISOString().slice(0, 19)}.webm`
      a.click()
    },
    [state.blob, state.url]
  )

  /** Reseta todo o estado (libera URL de objeto) */
  const reset = useCallback(() => {
    if (state.url) URL.revokeObjectURL(state.url)
    setState({
      isRecording: false,
      duration: 0,
      blob: null,
      url: null,
      error: null,
    })
    chunksRef.current = []
  }, [state.url])

  return {
    ...state,
    startRecording,
    stopRecording,
    getBase64,
    download,
    reset,
  }
}
