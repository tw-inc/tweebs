interface DecisionPromptProps {
  question: string
  options: string[]
  onChoose: (choice: string) => void
}

export default function DecisionPrompt({ question, options, onChoose }: DecisionPromptProps) {
  return (
    <div className="decision-prompt">
      <div className="decision-question">{question}</div>
      <div className="decision-options">
        {options.map((option) => (
          <button
            key={option}
            className="decision-option-btn"
            onClick={() => onChoose(option)}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  )
}
