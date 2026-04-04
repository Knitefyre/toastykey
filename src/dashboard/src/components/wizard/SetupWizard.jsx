import React, { useState } from 'react';
import WizardStep from './WizardStep';
import WelcomeStep from './WelcomeStep';
import KeyImportStep from './KeyImportStep';
import BudgetStep from './BudgetStep';
import MCPConfigStep from './MCPConfigStep';
import Button from '../common/Button';

function SetupWizard({ onComplete }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [wizardData, setWizardData] = useState({
    keysAdded: 0,
    budgetSet: false
  });

  const totalSteps = 4;

  const goNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const goBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleKeysAdded = (count) => {
    setWizardData({ ...wizardData, keysAdded: count });
    goNext();
  };

  const handleBudgetSet = () => {
    setWizardData({ ...wizardData, budgetSet: true });
    goNext();
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <WizardStep
            stepNumber={1}
            totalSteps={totalSteps}
            title="Welcome to ToastyKey"
            description="Track, control, and understand your API costs"
          >
            <WelcomeStep onNext={goNext} />
          </WizardStep>
        );
      case 2:
        return (
          <WizardStep
            stepNumber={2}
            totalSteps={totalSteps}
            title="Import API Keys"
            description="Add your OpenAI and Anthropic API keys"
          >
            <KeyImportStep onKeysAdded={handleKeysAdded} onSkip={goNext} />
          </WizardStep>
        );
      case 3:
        return (
          <WizardStep
            stepNumber={3}
            totalSteps={totalSteps}
            title="Set Budget"
            description="Optional: Set spending limits"
          >
            <BudgetStep onBudgetSet={handleBudgetSet} onSkip={goNext} />
          </WizardStep>
        );
      case 4:
        return (
          <WizardStep
            stepNumber={4}
            totalSteps={totalSteps}
            title="MCP Configuration"
            description="Connect ToastyKey to Claude Code"
          >
            <MCPConfigStep onComplete={onComplete} />
          </WizardStep>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {renderStep()}

        {/* Navigation (except on first and last steps) */}
        {currentStep > 1 && currentStep < totalSteps && (
          <div className="mt-6 flex justify-between">
            <Button variant="secondary" onClick={goBack}>
              Back
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export default SetupWizard;
