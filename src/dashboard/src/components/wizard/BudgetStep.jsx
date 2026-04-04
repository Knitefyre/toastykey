import React, { useState } from 'react';
import { TrendingUp } from 'lucide-react';
import Button from '../common/Button';
import { setBudget } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';

function BudgetStep({ onBudgetSet, onSkip }) {
  const [period, setPeriod] = useState('month');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('INR');
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  const handleSetBudget = async () => {
    const amountNum = parseFloat(amount);
    if (!amount || isNaN(amountNum) || amountNum <= 0) {
      showToast('Please enter a valid amount', 'error');
      return;
    }

    setLoading(true);
    try {
      await setBudget({
        scope: 'global',
        period,
        limit: amountNum,
        currency
      });
      showToast('Budget set successfully', 'success');
      onBudgetSet();
    } catch (error) {
      showToast('Failed to set budget', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="text-center mb-6">
        <TrendingUp className="w-12 h-12 text-warning mx-auto mb-3" />
        <p className="text-text-secondary">
          Set spending limits to get alerts when you approach your budget
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-text-primary text-sm font-medium mb-2">Period</label>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="w-full bg-bg-surface border border-border rounded-md px-3 py-2 text-text-primary"
          >
            <option value="day">Daily</option>
            <option value="week">Weekly</option>
            <option value="month">Monthly</option>
          </select>
        </div>

        <div>
          <label className="block text-text-primary text-sm font-medium mb-2">Currency</label>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrency('INR')}
              className={`flex-1 px-4 py-2 rounded-md transition-colors ${
                currency === 'INR'
                  ? 'bg-success text-bg-primary font-medium'
                  : 'bg-bg-surface text-text-secondary'
              }`}
            >
              INR (₹)
            </button>
            <button
              onClick={() => setCurrency('USD')}
              className={`flex-1 px-4 py-2 rounded-md transition-colors ${
                currency === 'USD'
                  ? 'bg-success text-bg-primary font-medium'
                  : 'bg-bg-surface text-text-secondary'
              }`}
            >
              USD ($)
            </button>
          </div>
        </div>

        <div>
          <label className="block text-text-primary text-sm font-medium mb-2">Budget Limit</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="500"
            min="0"
            step="0.01"
            className="w-full bg-bg-surface border border-border rounded-md px-3 py-2 text-text-primary font-code"
          />
        </div>
      </div>

      <div className="mt-6 flex gap-3">
        <Button variant="secondary" onClick={onSkip} className="flex-1">
          Skip for now
        </Button>
        <Button
          variant="primary"
          onClick={handleSetBudget}
          loading={loading}
          disabled={!amount || loading}
          className="flex-1"
        >
          Set Budget
        </Button>
      </div>
    </div>
  );
}

export default BudgetStep;
