import React, { useState } from 'react';
import { Code, CheckCircle, Copy } from 'lucide-react';
import Button from '../common/Button';
import { useToast } from '../../contexts/ToastContext';

function MCPConfigStep({ onComplete }) {
  const [copied, setCopied] = useState(false);
  const { showToast } = useToast();

  const configPath = '~/Library/Application Support/Claude/claude_desktop_config.json';
  const configSnippet = `{
  "mcpServers": {
    "toastykey": {
      "command": "node",
      "args": [
        "/path/to/toastykey/src/index.js",
        "mcp"
      ]
    }
  }
}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(configSnippet);
    setCopied(true);
    showToast('Copied to clipboard', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFinish = () => {
    onComplete();
  };

  return (
    <div>
      <div className="text-center mb-6">
        <Code className="w-12 h-12 text-info mx-auto mb-3" />
        <p className="text-text-secondary">
          Connect ToastyKey to Claude Code for seamless cost monitoring
        </p>
      </div>

      <div className="mb-6">
        <h3 className="text-text-primary font-medium mb-2">1. Locate your config file</h3>
        <code className="block bg-bg-surface border border-border rounded-md px-3 py-2 text-text-primary text-sm font-code break-all">
          {configPath}
        </code>
      </div>

      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-text-primary font-medium">2. Add ToastyKey to MCP servers</h3>
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 px-3 py-1 bg-bg-surface hover:bg-bg-hover border border-border rounded-md text-text-secondary hover:text-text-primary transition-colors text-sm"
          >
            {copied ? (
              <>
                <CheckCircle className="w-4 h-4 text-success" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Copy
              </>
            )}
          </button>
        </div>
        <pre className="bg-bg-surface border border-border rounded-md p-4 text-text-primary text-sm font-code overflow-x-auto">
          {configSnippet}
        </pre>
      </div>

      <div className="mb-6">
        <h3 className="text-text-primary font-medium mb-2">3. Restart Claude Code</h3>
        <p className="text-text-secondary text-sm">
          Close and reopen Claude Code to activate the MCP connection
        </p>
      </div>

      <div className="p-4 bg-bg-surface border border-info rounded-md mb-6">
        <div className="flex items-start gap-2 text-sm">
          <Code className="w-4 h-4 text-info flex-shrink-0 mt-0.5" />
          <div className="text-text-secondary">
            <strong className="text-text-primary">Note:</strong> Replace <code className="text-info">/path/to/toastykey</code> with the actual folder where you installed ToastyKey (e.g. <code className="text-info">/Users/you/toastykey</code>). Then restart Claude Code.
          </div>
        </div>
      </div>

      <Button variant="primary" onClick={handleFinish} className="w-full">
        Finish Setup
      </Button>
    </div>
  );
}

export default MCPConfigStep;
