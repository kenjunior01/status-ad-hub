/**
 * AI Threat Pattern Detection — Analisa padrões de sensores do dispositivo
 * para detectar situações de perigo potenciais.
 * 
 * Utiliza: Acelerómetro, Giroscópio, GPS (velocidade/direcção), BLE RSSI.
 * Algoritmo de scoring multi-factor com thresholds adaptativos.
 */

declare const Accelerometer: any
declare const Gyroscope: any

import type { ThreatReading, ThreatAssessment } from '@/lib/types'

const BUFFER_SIZE = 30  // 30 readings (~30 seconds at 1Hz)
const BUFFER_MAX_AGE = 60_000  // 60 seconds

export class ThreatDetector {
  private buffer: ThreatReading[] = []
  private accelBaseline: { x: number; y: number; z: number } | null = null
  private baselineSamples = 0
  private baselineThreshold = 20
  private speedHistory: number[] = []
  private lastAssessment: ThreatAssessment = {
    level: 'safe',
    score: 0,
    factors: [],
    timestamp: Date.now(),
    recommendation: 'Todas as métricas normais.',
  }
  private listeners: Set<(assessment: ThreatAssessment) => void> = new Set()
  private accelSensor: any = null
  private gyroSensor: any = null
  private samplingInterval: ReturnType<typeof setInterval> | null = null
  private isRunning = false

  // Weight factors for each threat signal (sum = 100)
  private weights = {
    suddenAcceleration: 25,
    unusualMovement: 20,
    speedAnomaly: 20,
    directionChange: 15,
    bleSignalDrop: 20,
  }

  // Adaptive thresholds
  private thresholds = {
    accelSpike: 25,          // m/s² — sudden jerk
    accelVariance: 15,       // variance above baseline
    speedHigh: 15,           // m/s (~54 km/h)
    speedZeroToHigh: 10,     // m/s — sudden start
    directionChange: 90,     // degrees — sharp turn
    rssiDropThreshold: -70,  // dBm
    rssiSuddenDrop: 20,      // dBm change in <5s
  }

  start() {
    if (this.isRunning) return
    this.isRunning = true

    // Try to start accelerometer
    this.startAccelerometer()
    // Try to start gyroscope
    this.startGyroscope()
    // Start periodic sampling as fallback
    this.samplingInterval = setInterval(() => this.sample(), 1000)
  }

  stop() {
    this.isRunning = false
    this.accelSensor?.stop()
    this.gyroSensor?.stop()
    if (this.samplingInterval) {
      clearInterval(this.samplingInterval)
      this.samplingInterval = null
    }
  }

  onAssessment(listener: (assessment: ThreatAssessment) => void) {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  /** Push an external reading (e.g., GPS speed, BLE RSSI) */
  pushReading(partial: Partial<ThreatReading>) {
    const last = this.buffer[this.buffer.length - 1]
    const now = Date.now()

    const reading: ThreatReading = {
      timestamp: now,
      accelerometer: partial.accelerometer || last?.accelerometer || { x: 0, y: 9.8, z: 0 },
      gyroscope: partial.gyroscope ?? last?.gyroscope ?? null,
      speed: partial.speed ?? last?.speed ?? null,
      heading: partial.heading ?? last?.heading ?? null,
      rssi: partial.rssi ?? last?.rssi ?? null,
    }

    this.addReading(reading)
  }

  private startAccelerometer() {
    try {
 if ('Accelerometer' in window) {
        this.accelSensor = new Accelerometer({ frequency: 5 }) // 5Hz
        this.accelSensor.addEventListener('reading', () => {
          if (this.accelSensor) {
            this.pushReading({
              accelerometer: {
                x: this.accelSensor.x || 0,
                y: this.accelSensor.y || 0,
                z: this.accelSensor.z || 0,
              },
            })
          }
        })
        this.accelSensor.start()
      }
    } catch (e) {
      console.warn('[ThreatDetector] Accelerometer not available')
    }
  }

  private startGyroscope() {
    try {
      if ('Gyroscope' in window) {
        this.gyroSensor = new Gyroscope({ frequency: 5 })
        this.gyroSensor.addEventListener('reading', () => {
          if (this.gyroSensor) {
            this.pushReading({
              gyroscope: {
                x: this.gyroSensor.x || 0,
                y: this.gyroSensor.y || 0,
                z: this.gyroSensor.z || 0,
              },
            })
          }
        })
        this.gyroSensor.start()
      }
    } catch (e) {
      console.warn('[ThreatDetector] Gyroscope not available')
    }
  }

  private sample() {
    // Only push if no hardware sensors are providing data
    if (this.buffer.length === 0 || Date.now() - this.buffer[this.buffer.length - 1].timestamp > 2000) {
      this.pushReading({})
    }
    this.assess()
  }

  private addReading(reading: ThreatReading) {
    // Update baseline during calm period
    this.updateBaseline(reading)

    this.buffer.push(reading)
    if (this.buffer.length > BUFFER_SIZE) {
      this.buffer.shift()
    }

    // Prune old readings
    const cutoff = Date.now() - BUFFER_MAX_AGE
    while (this.buffer.length > 0 && this.buffer[0].timestamp < cutoff) {
      this.buffer.shift()
    }
  }

  private updateBaseline(reading: ThreatReading) {
    if (this.baselineSamples < this.baselineThreshold) {
      const { x, y, z } = reading.accelerometer
      if (!this.accelBaseline) {
        this.accelBaseline = { x, y, z }
      } else {
        this.accelBaseline.x = (this.accelBaseline.x * this.baselineSamples + x) / (this.baselineSamples + 1)
        this.accelBaseline.y = (this.accelBaseline.y * this.baselineSamples + y) / (this.baselineSamples + 1)
        this.accelBaseline.z = (this.accelBaseline.z * this.baselineSamples + z) / (this.baselineSamples + 1)
      }
      this.baselineSamples++
    }
  }

  private assess() {
    if (this.buffer.length < 5) return

    let totalScore = 0
    const factors: string[] = []
    const recent = this.buffer.slice(-10)

    // 1. Sudden acceleration detection
    const accelScore = this.detectSuddenAcceleration(recent)
    totalScore += accelScore.score * this.weights.suddenAcceleration / 100
    if (accelScore.factor) factors.push(accelScore.factor)

    // 2. Unusual movement pattern
    const movementScore = this.detectUnusualMovement()
    totalScore += movementScore.score * this.weights.unusualMovement / 100
    if (movementScore.factor) factors.push(movementScore.factor)

    // 3. Speed anomaly
    const speedScore = this.detectSpeedAnomaly(recent)
    totalScore += speedScore.score * this.weights.speedAnomaly / 100
    if (speedScore.factor) factors.push(speedScore.factor)

    // 4. Direction change
    const dirScore = this.detectDirectionChange(recent)
    totalScore += dirScore.score * this.weights.directionChange / 100
    if (dirScore.factor) factors.push(dirScore.factor)

    // 5. BLE signal drop
    const rssiScore = this.detectRSSIDrop(recent)
    totalScore += rssiScore.score * this.weights.bleSignalDrop / 100
    if (rssiScore.factor) factors.push(rssiScore.factor)

    // Clamp to 100
    totalScore = Math.min(100, Math.max(0, totalScore))

    // Determine level
    let level: ThreatAssessment['level'] = 'safe'
    let recommendation = 'Todas as métricas normais.'

    if (totalScore >= 75) {
      level = 'critical'
      recommendation = 'PERIGO DETECTADO! Padrão de movimento anómalo com alta confiança. Recomendada acção imediata.'
    } else if (totalScore >= 50) {
      level = 'high'
      recommendation = 'Elevado risco detectado. Movimento anómalo ou sinal BLE instável. Mantenha-se alerta.'
    } else if (totalScore >= 25) {
      level = 'elevated'
      recommendation = 'Alguma actividade incomum detectada. Monitorização aumentada activa.'
    }

    this.lastAssessment = {
      level,
      score: Math.round(totalScore),
      factors,
      timestamp: Date.now(),
      recommendation,
    }

    // Notify listeners
    this.listeners.forEach(l => {
      try { l(this.lastAssessment) } catch {}
    })
  }

  private detectSuddenAcceleration(recent: ThreatReading[]): { score: number; factor?: string } {
    if (recent.length < 3) return { score: 0 }
    for (let i = 1; i < recent.length; i++) {
 const prev = recent[i - 1].accelerometer
      const curr = recent[i].accelerometer
      const delta = Math.sqrt(
        Math.pow(curr.x - prev.x, 2) +
        Math.pow(curr.y - prev.y, 2) +
        Math.pow(curr.z - prev.z, 2)
      )
      if (delta > this.thresholds.accelSpike) {
        return {
          score: Math.min(100, (delta / this.thresholds.accelSpike) * 60),
          factor: `Aceleração brusca: ${delta.toFixed(1)} m/s²`,
        }
      }
    }
    return { score: 0 }
  }

  private detectUnusualMovement(): { score: number; factor?: string } {
    if (!this.accelBaseline || this.buffer.length < 10) return { score: 0 }

    const { x: bx, y: by, z: bz } = this.accelBaseline
    let totalVariance = 0
    const recent = this.buffer.slice(-10)

    for (const r of recent) {
      const { x, y, z } = r.accelerometer
      totalVariance += Math.sqrt(
        Math.pow(x - bx, 2) + Math.pow(y - by, 2) + Math.pow(z - bz, 2)
      )
    }
    const avgVariance = totalVariance / recent.length

    if (avgVariance > this.thresholds.accelVariance) {
      return {
        score: Math.min(100, (avgVariance / this.thresholds.accelVariance) * 50),
        factor: `Movimento anómalo: variação ${avgVariance.toFixed(1)} m/s² acima do baseline`,
      }
    }
    return { score: 0 }
  }

  private detectSpeedAnomaly(recent: ThreatReading[]): { score: number; factor?: string } {
    const speeds = recent.filter(r => r.speed !== null).map(r => r.speed!)
    if (speeds.length < 3) return { score: 0 }

    const avgSpeed = speeds.reduce((a, b) => a + b, 0) / speeds.length
    const maxSpeed = Math.max(...speeds)

    // Check for sudden start (0 to high speed)
    if (speeds[0] < 1 && maxSpeed > this.thresholds.speedZeroToHigh) {
      return {
        score: 70,
        factor: `Arranque brusco: 0 → ${maxSpeed.toFixed(1)} m/s`,
      }
    }

    // Check for sustained high speed
    if (avgSpeed > this.thresholds.speedHigh) {
      return {
        score: Math.min(100, (avgSpeed / this.thresholds.speedHigh) * 40),
        factor: `Velocidade elevada sustentada: ${avgSpeed.toFixed(1)} m/s`,
      }
    }

    return { score: 0 }
  }

  private detectDirectionChange(recent: ThreatReading[]): { score: number; factor?: string } {
    const headings = recent.filter(r => r.heading !== null).map(r => r.heading!)
    if (headings.length < 3) return { score: 0 }

    let maxChange = 0
    for (let i = 1; i < headings.length; i++) {
      let diff = Math.abs(headings[i] - headings[i - 1])
      if (diff > 180) diff = 360 - diff
      maxChange = Math.max(maxChange, diff)
    }

    if (maxChange > this.thresholds.directionChange) {
      return {
        score: Math.min(100, (maxChange / this.thresholds.directionChange) * 60),
        factor: `Mudança brusca de direcção: ${maxChange.toFixed(0)}°`,
      }
    }
    return { score: 0 }
  }

  private detectRSSIDrop(recent: ThreatReading[]): { score: number; factor?: string } {
    const rssiValues = recent.filter(r => r.rssi !== null).map(r => r.rssi!)
    if (rssiValues.length < 3) return { score: 0 }

    const latest = rssiValues[rssiValues.length - 1]
    const avg = rssiValues.reduce((a, b) => a + b, 0) / rssiValues.length

    // Check absolute threshold
    if (latest < this.thresholds.rssiDropThreshold) {
      return {
        score: 60,
        factor: `Sinal BLE muito fraco: ${latest} dBm`,
      }
    }

    // Check sudden drop
    const drop = Math.abs(avg - latest)
    if (drop > this.thresholds.rssiSuddenDrop) {
      return {
        score: Math.min(100, (drop / this.thresholds.rssiSuddenDrop) * 70),
        factor: `Queda súbita de sinal BLE: ${drop.toFixed(0)} dBm`,
      }
    }

    return { score: 0 }
  }

  getCurrentAssessment(): ThreatAssessment {
    return { ...this.lastAssessment }
  }

  get bufferSize() { return this.buffer.length }
}

/** Singleton instance */
let _instance: ThreatDetector | null = null

export function getThreatDetector(): ThreatDetector {
  if (!_instance) {
    _instance = new ThreatDetector()
  }
  return _instance
}
