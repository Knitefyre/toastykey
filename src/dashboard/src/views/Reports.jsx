import React from 'react';
import { FileText, Calendar, TrendingUp, PieChart, Download } from 'lucide-react';
import Card from '../components/common/Card';

function Reports() {
  const plannedFeatures = [
    {
      icon: Calendar,
      title: 'Custom Date Ranges',
      description: 'Generate reports for any time period'
    },
    {
      icon: TrendingUp,
      title: 'Trend Analysis',
      description: 'Identify spending patterns and anomalies'
    },
    {
      icon: PieChart,
      title: 'Cost Breakdowns',
      description: 'Detailed breakdowns by provider, model, project'
    },
    {
      icon: Download,
      title: 'Export to CSV/PDF',
      description: 'Download reports for accounting and analysis'
    }
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary mb-2">Reports</h1>
        <p className="text-text-secondary">
          Comprehensive cost reports and analytics
        </p>
      </div>

      <Card>
        <div className="p-12 text-center">
          <FileText className="w-16 h-16 text-text-muted mx-auto mb-4" />
          <h2 className="text-xl font-bold text-text-primary mb-2">
            Coming in Session 3
          </h2>
          <p className="text-text-secondary mb-8">
            Advanced reporting features will be available in v0.3.0
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
            {plannedFeatures.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={index}
                  className="bg-bg-surface border border-border rounded-md p-4 text-left"
                >
                  <Icon className="w-6 h-6 text-text-muted mb-2" />
                  <h3 className="text-text-primary font-medium mb-1">{feature.title}</h3>
                  <p className="text-text-secondary text-sm">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </Card>
    </div>
  );
}

export default Reports;
