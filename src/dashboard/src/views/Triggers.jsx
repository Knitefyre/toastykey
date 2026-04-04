import React from 'react';
import { Zap, AlertCircle, Mail, Webhook } from 'lucide-react';
import Card from '../components/common/Card';

function Triggers() {
  const plannedFeatures = [
    {
      icon: AlertCircle,
      title: 'Budget Alerts',
      description: 'Get notified when spending approaches limits'
    },
    {
      icon: Mail,
      title: 'Email Notifications',
      description: 'Send alerts via email to your team'
    },
    {
      icon: Webhook,
      title: 'Webhook Triggers',
      description: 'Integrate with external services via webhooks'
    },
    {
      icon: Zap,
      title: 'Custom Actions',
      description: 'Execute custom scripts on trigger events'
    }
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary mb-2">Triggers & Alerts</h1>
        <p className="text-text-secondary">
          Automated actions and notifications based on spending patterns
        </p>
      </div>

      <Card>
        <div className="p-12 text-center">
          <Zap className="w-16 h-16 text-text-muted mx-auto mb-4" />
          <h2 className="text-xl font-bold text-text-primary mb-2">
            Coming in Session 3
          </h2>
          <p className="text-text-secondary mb-8">
            Triggers and automated alerts will be available in v0.3.0
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

export default Triggers;
