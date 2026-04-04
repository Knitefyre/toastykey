import React from 'react';
import Card from '../common/Card';

function WizardStep({ stepNumber, totalSteps, title, description, children }) {
  const progressPercent = (stepNumber / totalSteps) * 100;

  return (
    <div>
      {/* Progress bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-text-secondary text-sm">
            Step {stepNumber} of {totalSteps}
          </span>
          <span className="text-text-secondary text-sm">{Math.round(progressPercent)}%</span>
        </div>
        <div className="w-full bg-bg-hover rounded-full h-2 overflow-hidden">
          <div
            className="h-full bg-success transition-all duration-300 rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Step content */}
      <Card>
        <div className="p-8">
          <h2 className="text-2xl font-bold text-text-primary mb-2">{title}</h2>
          <p className="text-text-secondary mb-6">{description}</p>
          {children}
        </div>
      </Card>
    </div>
  );
}

export default WizardStep;
