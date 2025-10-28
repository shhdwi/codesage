"use client";

import { useState, useEffect } from "react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface TrendData {
  week: string;
  avgScore: number;
  count: number;
  byAgent: Array<{ agentName: string; avgScore: number }>;
}

interface ComparisonData {
  agentName: string;
  reviewCount: number;
  avgScore: number;
  dimensionAvgs: Record<string, number>;
  avgFeedback: number | null;
}

interface CostData {
  date: string;
  tokens: number;
  cost: number;
  count: number;
}

export default function AnalyticsPage() {
  const [trends, setTrends] = useState<TrendData[]>([]);
  const [comparison, setComparison] = useState<ComparisonData[]>([]);
  const [costs, setCosts] = useState<CostData[]>([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  useEffect(() => {
    fetchData();
  }, [days]);

  const fetchData = async () => {
    setLoading(true);
    const [trendsRes, comparisonRes, costsRes] = await Promise.all([
      fetch(`/api/analytics/trends?days=${days}`).then(r => r.json()),
      fetch(`/api/analytics/comparison?days=${days}`).then(r => r.json()),
      fetch(`/api/analytics/costs?days=${days}&type=trends`).then(r => r.json()),
    ]);
    
    setTrends(trendsRes.trends || []);
    setComparison(comparisonRes.comparison || []);
    setCosts(costsRes.trends || []);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-gray-500">Loading analytics...</p>
      </div>
    );
  }

  // Prepare dimension breakdown data
  const dimensionData = comparison.length > 0
    ? Object.keys(comparison[0].dimensionAvgs).map(dim => ({
        dimension: dim,
        ...Object.fromEntries(comparison.map(c => [c.agentName, c.dimensionAvgs[dim]])),
      }))
    : [];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
          <p className="mt-2 text-gray-600">Review quality metrics and insights</p>
        </div>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm"
        >
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      {/* Agent Leaderboard */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Agent Leaderboard</h2>
        {comparison.length === 0 ? (
          <p className="text-sm text-gray-500">No data available</p>
        ) : (
          <div className="space-y-3">
            {comparison.map((agent, idx) => (
              <div key={agent.agentName} className="flex items-center justify-between rounded-lg bg-gray-50 p-4">
                <div className="flex items-center gap-4">
                  <span className={`text-2xl font-bold ${
                    idx === 0 ? 'text-yellow-500' :
                    idx === 1 ? 'text-gray-400' :
                    idx === 2 ? 'text-amber-600' :
                    'text-gray-300'
                  }`}>
                    #{idx + 1}
                  </span>
                  <div>
                    <p className="font-medium text-gray-900">{agent.agentName}</p>
                    <p className="text-sm text-gray-500">{agent.reviewCount} reviews</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-blue-600">{agent.avgScore}</p>
                  <p className="text-xs text-gray-500">Avg Score</p>
                  {agent.avgFeedback !== null && (
                    <p className="text-xs text-gray-500">User: {agent.avgFeedback}/5</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Helpfulness Trends */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Helpfulness Over Time</h2>
        {trends.length === 0 ? (
          <p className="text-sm text-gray-500">No trend data available</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="week" />
              <YAxis domain={[0, 10]} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="avgScore" stroke="#3b82f6" strokeWidth={2} name="Avg Score" />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Dimension Breakdown */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Evaluation Dimension Breakdown</h2>
        {dimensionData.length === 0 ? (
          <p className="text-sm text-gray-500">No dimension data available</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dimensionData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="dimension" />
              <YAxis domain={[0, 10]} />
              <Tooltip />
              <Legend />
              {comparison.map((agent, idx) => (
                <Bar
                  key={agent.agentName}
                  dataKey={agent.agentName}
                  fill={`hsl(${idx * 60}, 70%, 50%)`}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Cost Tracking */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Cost Tracking</h2>
        {costs.length === 0 ? (
          <p className="text-sm text-gray-500">No cost data available</p>
        ) : (
          <>
            <div className="mb-6 grid grid-cols-3 gap-4">
              <div className="rounded-lg bg-gray-50 p-4">
                <p className="text-sm text-gray-500">Total Tokens</p>
                <p className="text-2xl font-bold text-gray-900">
                  {costs.reduce((sum, c) => sum + c.tokens, 0).toLocaleString()}
                </p>
              </div>
              <div className="rounded-lg bg-gray-50 p-4">
                <p className="text-sm text-gray-500">Total Cost</p>
                <p className="text-2xl font-bold text-gray-900">
                  ${costs.reduce((sum, c) => sum + c.cost, 0).toFixed(2)}
                </p>
              </div>
              <div className="rounded-lg bg-gray-50 p-4">
                <p className="text-sm text-gray-500">Avg Cost/Review</p>
                <p className="text-2xl font-bold text-gray-900">
                  ${(costs.reduce((sum, c) => sum + c.cost, 0) / costs.reduce((sum, c) => sum + c.count, 0)).toFixed(4)}
                </p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={costs}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(value: any) => `$${Number(value).toFixed(4)}`} />
                <Line type="monotone" dataKey="cost" stroke="#10b981" strokeWidth={2} name="Daily Cost ($)" />
              </LineChart>
            </ResponsiveContainer>
          </>
        )}
      </div>

      {/* Feedback Correlation */}
      {comparison.some(c => c.avgFeedback !== null) && (
        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="text-lg font-medium text-gray-900 mb-4">LLM vs. User Feedback Comparison</h2>
          <div className="space-y-3">
            {comparison.filter(c => c.avgFeedback !== null).map((agent) => (
              <div key={agent.agentName} className="flex items-center gap-4">
                <div className="w-32 text-sm font-medium text-gray-700">{agent.agentName}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <div className="h-4 w-full rounded-full bg-gray-200">
                        <div
                          className="h-4 rounded-full bg-blue-500"
                          style={{ width: `${(agent.avgScore / 10) * 100}%` }}
                        />
                      </div>
                      <p className="mt-1 text-xs text-gray-500">LLM: {agent.avgScore}/10</p>
                    </div>
                    <div className="flex-1">
                      <div className="h-4 w-full rounded-full bg-gray-200">
                        <div
                          className="h-4 rounded-full bg-green-500"
                          style={{ width: `${((agent.avgFeedback || 0) / 5) * 100}%` }}
                        />
                      </div>
                      <p className="mt-1 text-xs text-gray-500">User: {agent.avgFeedback}/5</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

