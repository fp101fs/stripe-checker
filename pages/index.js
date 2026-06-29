import { useState, useEffect } from 'react';

export default function Home() {
  const [stripeApiKey, setStripeApiKey] = useState('');
  const [openRouterApiKey, setOpenRouterApiKey] = useState('');
  const [charges, setCharges] = useState([]);
  const [loading, setLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [error, setError] = useState('');

  // Mock failed charges data (in production you'd fetch from Stripe API)
  const mockFailedCharges = [
    {
      id: 'ch_1h2k3j4k5l6m7n8o9p0q1r2s',
      amount: 1999,
      currency: 'usd',
      status: 'failed',
      created: 1698765432,
      failure_reason: 'insufficient_funds',
      customer: 'cust_98765'
    },
    {
      id: 'ch_1h2k3j4k5l6m7n8o9p0q1r2t',
      amount: 2999,
      currency: 'usd',
      status: 'failed',
      created: 1698765400,
      failure_reason: 'card_declined',
      customer: 'cust_12345'
    },
    {
      id: 'ch_1h2k3j4k5l6m7n8o9p0q1r2u',
      amount: 4500,
      currency: 'usd',
      status: 'failed',
      created: 1698765370,
      failure_reason: 'expired_card',
      customer: 'cust_54321'
    },
    {
      id: 'ch_1h2k3j4k5l6m7n8o9p0q1r2v',
      amount: 7500,
      currency: 'usd',
      status: 'failed',
      created: 1698765340,
      failure_reason: 'fraudulent_payment',
      customer: 'cust_77777'
    }
  ];

  // Format amount
  const formatAmount = (cents) => (cents / 100).toFixed(2);

  // Get failure reason description
  const getFailureReason = (reasonKey) => {
    const reasonMap = {
      'insufficient_funds': 'Insufficient funds in customer's payment method',
      'card_declined': 'Card was declined by issuer',
      'expired_card': 'Payment method has expired',
      'fraudulent_payment': 'Payment flagged for fraud',
      'incorrect_routing_number': 'Incorrect routing number for bank transfer',
      'invalid_account': 'Invalid bank account details'
    };
    return reasonMap[reasonKey] || reasonKey;
  };

  // Load charges (simulated)
  const loadCharges = async () => {
    if (!stripeApiKey) {
      setError('Please enter your Stripe API key');
      return;
    }
    
    setLoading(true);
    setError('');
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Set mock charges
    setCharges(mockFailedCharges);
    setAnalysisResult(null);
  };

  // Analyze with AI
  const analyzeWithAI = async () => {
    if (charges.length === 0) return;
    
    setLoading(true);
    setError('');
    
    try {
      // Prepare data for AI
      const chargeData = charges.map(ch => ({
        id: ch.id,
        amount: formatAmount(ch.amount),
        currency: ch.currency,
        created: new Date(ch.created * 1000).toLocaleString(),
        reason: getFailureReason(ch.failure_reason),
        customer: ch.customer || 'unknown'
      }));

      // Build prompt
      const prompt = `You are an expert in Stripe payments. Analyze these failed charges and provide:
1. Key issues identified (max 3)
2. Actionable fixes for each issue
3. One concise insight about the likely root cause

Format your response as JSON with these fields:
{
  "issues": [
    {
      "title": "Issue title",
      "description": "Short description"
    }
  ],
  "fixes": [
    "Fix suggestion 1",
    "Fix suggestion 2"
  ],
  "insight": "Brief insight about root cause"
}
Here are the failed charges:
${chargeData.map(c => `- \`${c.id}\`: ${c.amount} ${c.currency} (${c.reason}) - Customer: ${c.customer} (${new Date(c.created * 1000).toLocaleString()})`).join('\n')}`;

      // Call OpenRouter AI
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openRouterApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-4-turbo',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 500
        })
      });

      if (!response.ok) {
        const err = await response.text();
        throw new Error(`OpenRouter error: ${response.status} - ${err}`);
      }

      const aiResponse = await response.json();
      const aiMessage = aiResponse.choices?.[0]?.message?.content;
      
      if (!aiMessage) throw new Error("No response from AI");

      // Parse JSON response
      const parsed = JSON.parse(aiMessage);
      
      // Display results
      const issuesHtml = parsed.issues?.map(issue => 
        `<div class="issue-item">
          <div class="issue-icon">⚠️</div>
          <div class="issue-content">
            <div class="issue-title">${issue.title}</div>
            <div class="issue-desc">${issue.description}</div>
          </div>
        </div>`
      ).join('') || '<div class="issue-item"><div class="issue-desc">No specific issues identified</div></div>';

      const fixesHtml = parsed.fixes?.map(fix => 
        `<div class="fix-item">${fix}</div>`
      ).join('') || '<div class="fix-item">No specific fixes suggested</div>';

      setAnalysisResult({
        insight: parsed.insight || 'Unable to extract insight',
        issuesHtml,
        fixesHtml
      });
    } catch (err) {
      console.error(err);
      setError(`Analysis failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="glass">
      <div className="icon">⚡</div>
      <h1>Stripe Seller Analyzer</h1>
      <p className="subtitle">Enter your Stripe API key to load recent failed charges and analyze them with AI</p>

      <div className="input-grid">
        <div className="input-group">
          <label htmlFor="stripe-api-key">Stripe API Secret Key</label>
          <input
            id="stripe-api-key"
            value={stripeApiKey}
            onChange={(e) => setStripeApiKey(e.target.value)}
            placeholder="sk_test_..."
            style={{ width: "100%" }}
          />
        </div>
        <div className="input-group">
          <label htmlFor="openrouter-api-key">OpenRouter API Key <small>(optional for AI analysis)</small></label>
          <input
            id="openrouter-api-key"
            value={openRouterApiKey}
            onChange={(e) => setOpenRouterApiKey(e.target.value)}
            placeholder="sk-or-..."
            style={{ width: "100%" }}
          />
        </div>
      </div>

      <div className="section">
        <div className="section-title"><i>🔍</i>Recent Failed Charges</div>
        <div id="failed-charges-list" className="card-list">
          {charges.map(charge => (
            <div key={charge.id} className="card-item">
              <div className="card-item-header">
                <span className="card-item-id">Charge ID: {charge.id}</span>
                <span className="card-item-status" style={{ background: getStatusBackground(charge) }}>
                  {charge.status.toUpperCase()}
                </span>
              </div>
              <div style={{ fontSize: "0.9rem", color: "#ddd" }}>
                Amount: ${formatAmount(charge.amount)} {charge.currency.toUpperCase()} • Created: {new Date(charge.created * 1000).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="btn-group">
        <button
          onClick={loadCharges}
          disabled={loading}
          className="btn primary"
        >
          <i></i> Load Failed Charges
        </button>
        <button
          onClick={analyzeWithAI}
          disabled={loading || charges.length === 0}
          className="btn secondary"
          style={{ display: charges.length > 0 ? "block" : "none" }}
        >
          <i></i> Analyze with AI
        </button>
      </div>

      {error && (
        <div className="status-badge status-failed" style={{ marginTop: "1rem" }}>
          {error}
        </div>
      )}

      {loading && (
        <div className="status-badge" style={{ marginTop: "1rem" }}>
          Loading...
        </div>
      )}

      {analysisResult && (
        <div id="result" className="analysis" style={{ marginTop: "1.75rem" }}>
          <div className="analysis-title">🤖 AI Analysis & Fixes</div>
          <div className="ai-insight">
            <div className="ai-insight-title">💡 AI Insight</div>
            <div id="ai-insight-text">{analysisResult.insight}</div>
          </div>
          <div className="issue-section">
            <div className="analysis-title">⚠️ Issues Identified</div>
            <div 
              className="analysis-content" 
              dangerouslySetInnerHTML={{ __html: analysisResult.issuesHtml }}
            />
          </div>
          <div className="fix-section">
            <div className="analysis-title">🔧 Recommended Actions</div>
            <div 
              className="analysis-content" 
              dangerouslySetInnerHTML={{ __html: analysisResult.fixesHtml }}
            />
          </div>
        </div>
      )}

      <div className="footer">Powered by Stripe & OpenRouter AI</div>
    </main>
  );
}

// Helper to get status background color
function getStatusBackground(charge) {
  const statuses = {
    'succeeded': '#4683ff',
    'processing': '#22c55e',
    'failed': '#ff6b6b',
    'canceled': '#7f7fff'
  };
  return statuses[charge.status] || '#ff6b6b';
}