import { useState, useRef } from 'react'

export default function DietLogScreen({ onAnalyse, onBack }) {
  const [imageDataUrl, setImageDataUrl] = useState(null)
  const [description, setDescription]   = useState('')
  const fileInputRef = useRef(null)

  const canAnalyse = imageDataUrl !== null || description.trim().length > 3

  function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => setImageDataUrl(ev.target.result)
    reader.readAsDataURL(file)
  }

  function handleSubmit() {
    if (!canAnalyse) return
    onAnalyse(imageDataUrl, description.trim())
  }

  return (
    <div className="screen diet-log-screen">
      <button className="btn-back" onClick={onBack} aria-label="Back">
        <BackIcon />
      </button>

      <h2 className="diet-heading">Log a meal</h2>

      {/* Photo upload area */}
      <p className="diet-section-label">Add photo of your meal</p>

      {imageDataUrl ? (
        <div className="diet-upload-area diet-upload-area--has-image" onClick={() => fileInputRef.current?.click()}>
          <img src={imageDataUrl} alt="Meal preview" className="diet-upload-preview" />
          <span className="diet-upload-change">Tap to change photo</span>
        </div>
      ) : (
        <button
          className="diet-upload-area"
          onClick={() => fileInputRef.current?.click()}
          aria-label="Add meal photo"
        >
          <CameraIcon />
          <span>Tap to add photo</span>
        </button>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      {/* Text description */}
      <p className="diet-section-label">Or describe your meal here…</p>

      <textarea
        className="diet-textarea"
        placeholder="e.g. Grilled salmon with leafy salad and olive oil dressing"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={4}
      />

      <div className="diet-action-row">
        <button
          className="start-btn"
          disabled={!canAnalyse}
          onClick={handleSubmit}
        >
          Analyse meal
        </button>
      </div>
    </div>
  )
}

function CameraIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <rect x="4" y="12" width="40" height="28" rx="4" stroke="currentColor" strokeWidth="2.5" />
      <circle cx="24" cy="26" r="8" stroke="currentColor" strokeWidth="2.5" />
      <path d="M17 12L20 8h8l3 4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="38" cy="18" r="2" fill="currentColor" />
    </svg>
  )
}

function BackIcon() {
  return (
    <svg width="30" height="30" viewBox="0 0 30 30" fill="none">
      <path d="M19 7L11 15L19 23" stroke="currentColor" strokeWidth="2.5"
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
