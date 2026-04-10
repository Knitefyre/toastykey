import React from 'react';
import { Image, MessageSquare, Music } from 'lucide-react';
import Card from '../common/Card';
import Skeleton from '../common/Skeleton';
import { formatINR, formatUSD, formatNumber } from '../../services/formatters';
import { useApp } from '../../contexts/AppContext';

const OUTPUT_DEFS = [
  { key: 'images',    Icon: Image,         label: 'Images',       color: '#60A5FA' },
  { key: 'llm_calls', Icon: MessageSquare, label: 'LLM Calls',    color: '#34D399' },
  { key: 'audio',     Icon: Music,         label: 'Audio Minutes', color: '#FBBF24' },
];

function TangibleOutputs({ outputs, loading }) {
  const { state } = useApp();
  const fmt = (v) => state.currency === 'INR' ? formatINR(v) : formatUSD(v);

  if (loading) {
    return (
      <Card title="What You Got" tooltip="Tangible outputs from your API spend — images, LLM calls, audio minutes.">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <Skeleton.Card key={i} />)}
        </div>
      </Card>
    );
  }

  return (
    <Card title="What You Got" tooltip="What you actually created with your API spend — images, conversations, audio. More tangible than raw dollar amounts.">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {OUTPUT_DEFS.map(({ key, Icon, label, color }) => {
          const count = outputs?.[key]?.count || 0;
          const cost  = outputs?.[key]?.cost  || 0;
          return (
            <div
              key={key}
              className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-4 hover:bg-white/[0.04] transition-all duration-200"
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center mb-3"
                style={{ backgroundColor: `${color}18` }}
              >
                <Icon className="w-4 h-4" style={{ color }} />
              </div>
              <div className="font-mono text-[22px] font-semibold text-white/90 tabular-nums leading-none mb-1">
                {formatNumber(count)}
              </div>
              <div className="text-[12px] text-white/40 mb-0.5">{label}</div>
              <div className="text-[11px] text-white/20 font-mono tabular-nums">{fmt(cost)}</div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

export default TangibleOutputs;
