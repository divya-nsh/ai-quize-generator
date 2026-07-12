import { useCallback, useMemo, useRef } from 'react'

export function useSound() {
  const ctx = useRef<AudioContext>(null)
  function getCtx() {
    if (!ctx.current) ctx.current = new AudioContext()
    return ctx.current
  }

  const correct = useCallback(() => {
    const ac = getCtx()
    const g = ac.createGain()
    g.connect(ac.destination)
    g.gain.setValueAtTime(0.18, ac.currentTime)
    g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.5)
    ;[523, 659, 784].forEach((freq, i) => {
      const o = ac.createOscillator()
      o.type = 'sine'
      o.frequency.value = freq
      o.connect(g)
      o.start(ac.currentTime + i * 0.08)
      o.stop(ac.currentTime + i * 0.08 + 0.25)
    })
  }, [])

  const wrong = useCallback(() => {
    const ac = getCtx()
    const g = ac.createGain()
    g.connect(ac.destination)
    g.gain.setValueAtTime(0.15, ac.currentTime)
    g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.4)
    ;[300, 220].forEach((freq, i) => {
      const o = ac.createOscillator()
      o.type = 'sawtooth'
      o.frequency.value = freq
      o.connect(g)
      o.start(ac.currentTime + i * 0.1)
      o.stop(ac.currentTime + i * 0.1 + 0.2)
    })
  }, [])

  const whoosh = useCallback(() => {
    const ac = getCtx()
    const g = ac.createGain()
    g.connect(ac.destination)
    g.gain.setValueAtTime(0.08, ac.currentTime)
    g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.3)
    const o = ac.createOscillator()
    o.type = 'sine'
    o.frequency.setValueAtTime(200, ac.currentTime)
    o.frequency.exponentialRampToValueAtTime(600, ac.currentTime + 0.15)
    o.connect(g)
    o.start(ac.currentTime)
    o.stop(ac.currentTime + 0.3)
  }, [])

  const finish = useCallback(() => {
    const ac = getCtx()
    ;[523, 659, 784, 1046].forEach((freq, i) => {
      const g = ac.createGain()
      g.connect(ac.destination)
      g.gain.setValueAtTime(0.12, ac.currentTime + i * 0.12)
      g.gain.exponentialRampToValueAtTime(
        0.001,
        ac.currentTime + i * 0.12 + 0.4,
      )
      const o = ac.createOscillator()
      o.type = 'sine'
      o.frequency.value = freq
      o.connect(g)
      o.start(ac.currentTime + i * 0.12)
      o.stop(ac.currentTime + i * 0.12 + 0.4)
    })
  }, [])

  const win = useCallback(() => {
    const ac = getCtx()
    // Fanfare: ascending major arpeggio
    const fanfare = [523, 659, 784, 1046, 1318]
    fanfare.forEach((freq, i) => {
      const g = ac.createGain()
      g.connect(ac.destination)
      g.gain.setValueAtTime(0.18, ac.currentTime + i * 0.1)
      g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + i * 0.1 + 0.5)
      const o = ac.createOscillator()
      o.type = 'sine'
      o.frequency.value = freq
      o.connect(g)
      o.start(ac.currentTime + i * 0.1)
      o.stop(ac.currentTime + i * 0.1 + 0.5)
    })
    // Sparkle layer: high shimmer notes
    const sparkle = [2093, 2637, 3136]
    sparkle.forEach((freq, i) => {
      const g = ac.createGain()
      g.connect(ac.destination)
      g.gain.setValueAtTime(0.07, ac.currentTime + 0.55 + i * 0.08)
      g.gain.exponentialRampToValueAtTime(
        0.001,
        ac.currentTime + 0.55 + i * 0.08 + 0.3,
      )
      const o = ac.createOscillator()
      o.type = 'sine'
      o.frequency.value = freq
      o.connect(g)
      o.start(ac.currentTime + 0.55 + i * 0.08)
      o.stop(ac.currentTime + 0.55 + i * 0.08 + 0.3)
    })
    // Final held chord
    ;[523, 659, 784].forEach((freq) => {
      const g = ac.createGain()
      g.connect(ac.destination)
      g.gain.setValueAtTime(0.1, ac.currentTime + 0.9)
      g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.9 + 1.2)
      const o = ac.createOscillator()
      o.type = 'sine'
      o.frequency.value = freq
      o.connect(g)
      o.start(ac.currentTime + 0.9)
      o.stop(ac.currentTime + 0.9 + 1.2)
    })
  }, [])

  const fiftyFifty = useCallback(() => {
    const ac = getCtx()
    // Two quick descending sweeps — one per eliminated option
    ;[0, 0.2].forEach((delay) => {
      const g = ac.createGain()
      g.connect(ac.destination)
      g.gain.setValueAtTime(0.12, ac.currentTime + delay)
      g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + delay + 0.18)
      const o = ac.createOscillator()
      o.type = 'triangle'
      o.frequency.setValueAtTime(900, ac.currentTime + delay)
      o.frequency.exponentialRampToValueAtTime(180, ac.currentTime + delay + 0.18)
      o.connect(g)
      o.start(ac.currentTime + delay)
      o.stop(ac.currentTime + delay + 0.18)
    })
  }, [])

  return useMemo(
    () => ({ correct, wrong, whoosh, finish, win, fiftyFifty }),
    [correct, wrong, whoosh, finish, win, fiftyFifty],
  )
}
