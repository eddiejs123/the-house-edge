let ctx: AudioContext | null = null
function getCtx() {
  if (!ctx) ctx = new AudioContext()
  return ctx
}

function ramp(gain: GainNode, val: number, t: number) {
  gain.gain.linearRampToValueAtTime(val, t)
}

export function playDeal(delaySeconds = 0) {
  try {
    const ac = getCtx()
    const t = ac.currentTime + delaySeconds

    const buf = ac.createBuffer(1, ac.sampleRate * 0.08, ac.sampleRate)
    const d = buf.getChannelData(0)
    for (let i = 0; i < d.length; i++) {
      d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2.5)
    }

    const src = ac.createBufferSource()
    src.buffer = buf

    const filter = ac.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.value = 2200
    filter.Q.value = 1.2

    const gain = ac.createGain()
    gain.gain.setValueAtTime(0.18, t)
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08)

    src.connect(filter).connect(gain).connect(ac.destination)
    src.start(t)
  } catch {}
}

export function playCorrect() {
  try {
    const ac = getCtx()
    const t = ac.currentTime

    const freqs = [523.25, 659.25, 783.99]  // C5-E5-G5 arpeggio
    freqs.forEach((freq, i) => {
      const osc = ac.createOscillator()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, t + i * 0.07)

      const gain = ac.createGain()
      const start = t + i * 0.07
      gain.gain.setValueAtTime(0, start)
      gain.gain.linearRampToValueAtTime(0.18, start + 0.01)
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.22)

      osc.connect(gain).connect(ac.destination)
      osc.start(start)
      osc.stop(start + 0.25)
    })
  } catch {}
}

export function playWrong() {
  try {
    const ac = getCtx()
    const t = ac.currentTime

    const osc = ac.createOscillator()
    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(220, t)
    osc.frequency.exponentialRampToValueAtTime(130, t + 0.18)

    const gain = ac.createGain()
    gain.gain.setValueAtTime(0.15, t)
    ramp(gain, 0.12, t + 0.1)
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22)

    const filter = ac.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = 800

    osc.connect(filter).connect(gain).connect(ac.destination)
    osc.start(t)
    osc.stop(t + 0.25)
  } catch {}
}
