import { FC } from "react"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"

interface EvaluateButtonProps {
  disabled: boolean
  isEvaluating: boolean
  onClick: () => void
}

export const EvaluateButton: FC<EvaluateButtonProps> = ({ 
  disabled, 
  isEvaluating, 
  onClick 
}) => {
  return (
    <div className="flex justify-center mb-8">
      <Button
        onClick={onClick}
        disabled={disabled}
        size="lg"
        className="min-w-[200px]"
      >
        {isEvaluating ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Evaluating... (30-60s)
          </>
        ) : (
          "Evaluate Videos"
        )}
      </Button>
    </div>
  )
}
