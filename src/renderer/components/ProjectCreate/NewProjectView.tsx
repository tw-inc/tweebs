import { useState } from 'react'
import { useProjectStore } from '../../stores/projectStore'
import { useAppStore } from '../../stores/appStore'

const BLUEPRINTS = [
  { id: 'personal-website', name: 'Personal Website', icon: '🌐', description: 'Next.js portfolio or blog' },
  { id: 'ios-app', name: 'iOS App', icon: '📱', description: 'SwiftUI native app' },
  { id: 'chrome-extension', name: 'Chrome Extension', icon: '🧩', description: 'Manifest V3 extension' },
  { id: 'shopify-store', name: 'Shopify Store', icon: '🛍', description: 'Custom Shopify theme or app' }
]

export default function NewProjectView({ onBack }: { onBack: () => void }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [selectedBlueprint, setSelectedBlueprint] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  const createProject = useProjectStore((s) => s.createProject)
  const openProject = useAppStore((s) => s.openProject)

  const canCreate = name.trim().length > 0 && selectedBlueprint !== null

  async function handleCreate() {
    if (!canCreate || creating) return
    setCreating(true)
    try {
      const project = await createProject(name.trim(), description.trim(), selectedBlueprint!)
      openProject(project.id)
    } catch (err) {
      console.error('Failed to create project:', err)
      setCreating(false)
    }
  }

  return (
    <div className="new-project">
      <div className="new-project-header">
        <button className="back-btn" onClick={onBack}>
          ← Back
        </button>
        <h2>New Project</h2>
      </div>

      <div className="new-project-form">
        <div className="form-group">
          <label>What should we call it?</label>
          <input
            type="text"
            placeholder="My Portfolio"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            maxLength={50}
          />
        </div>

        <div className="form-group">
          <label>Tell us more (optional)</label>
          <textarea
            placeholder="A photography portfolio with a gallery and contact page..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
        </div>

        <div className="form-group">
          <label>What are we building?</label>
          <div className="blueprint-grid">
            {BLUEPRINTS.map((bp) => (
              <button
                key={bp.id}
                className={`blueprint-card ${selectedBlueprint === bp.id ? 'selected' : ''}`}
                onClick={() => setSelectedBlueprint(bp.id)}
              >
                <span className="blueprint-icon">{bp.icon}</span>
                <span className="blueprint-name">{bp.name}</span>
                <span className="blueprint-desc">{bp.description}</span>
              </button>
            ))}
          </div>
        </div>

        <button
          className="create-btn"
          onClick={handleCreate}
          disabled={!canCreate || creating}
        >
          {creating ? 'Setting up...' : 'Start Building'}
        </button>
      </div>
    </div>
  )
}
