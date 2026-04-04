import React from 'react';
import { CheckCircle } from 'lucide-react';
import Button from '../common/Button';

function WelcomeStep({ onNext }) {
  const features = [
    'Track API costs in real-time',
    'Manage keys securely with encryption',
    'Set budgets and spending limits',
    'Monitor usage across projects',
    'Integrate with Claude Code via MCP'
  ];

  return (
    <div>
      <div className="text-center mb-8">
        <div className="text-6xl mb-4">🔥</div>
        <h1 className="text-4xl font-code font-bold text-success mb-2">ToastyKey</h1>
        <p className="text-text-secondary">
          The API cost layer for AI-native builders
        </p>
      </div>

      <div className="space-y-3 mb-8">
        {features.map((feature, index) => (
          <div key={index} className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
            <span className="text-text-primary">{feature}</span>
          </div>
        ))}
      </div>

      <Button variant="primary" onClick={onNext} className="w-full">
        Get Started
      </Button>
    </div>
  );
}

export default WelcomeStep;
