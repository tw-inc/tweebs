import { useState } from 'react'

type View = 'home' | 'project' | 'onboarding' | 'settings'

export default function App() {
  const [_view, _setView] = useState<View>('home')

  return (
    <div className="app">
      <div className="app-centered">
        <h1 className="app-title">TWEEBS</h1>
        <p className="app-subtitle">Your team of AI engineers</p>
      </div>
    </div>
  )
}
