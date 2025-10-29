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
    <div className="space-y-8 animate-slide-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 tracking-tight">Analytics</h1>
          <p className="mt-2 text-lg text-gray-600">Review quality metrics and insights</p>
        </div>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="rounded-xl border-2 border-gray-200 bg-white px-5 py-3 text-sm font-medium text-gray-700 shadow-sm transition-all duration-200 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 hover:border-gray-300"
        >
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      {/* Agent Leaderboard */}
      <div className="rounded-2xl border-2 border-gray-200 bg-white p-8 shadow-lg">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-yellow-500">
            <svg className="h-6 w-6 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Agent Leaderboard</h2>
        </div>
        {comparison.length === 0 ? (
          <div className="text-center py-12">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 mb-4">
              <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <p className="text-base font-medium text-gray-500">No data available</p>
            <p className="text-sm text-gray-400 mt-1">Start creating reviews to see analytics</p>
          </div>
        ) : (
          <div className="space-y-4">
            {comparison.map((agent, idx) => (
              <div key={agent.agentName} className="group flex items-center justify-between rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 p-5 transition-all duration-200 hover:shadow-md hover:scale-[1.02]">
                <div className="flex items-center gap-5">
                  <div className="relative">
                    <span className={`text-3xl font-bold transition-all duration-200 ${
                      idx === 0 ? 'text-yellow-500 drop-shadow-lg' :
                      idx === 1 ? 'text-gray-400' :
                      idx === 2 ? 'text-amber-700' :
                      'text-gray-300'
                    }`}>
                      #{idx + 1}
                    </span>
                    {idx === 0 && (
                      <div className="absolute -top-1 -right-1">
                        <svg className="h-4 w-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="font-bold text-lg text-gray-900">{agent.agentName}</p>
                    <p className="text-sm text-gray-600">
                      <span className="font-semibold">{agent.reviewCount}</span> reviews
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent">
                    {agent.avgScore}
                  </p>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Avg Score</p>
                  {agent.avgFeedback !== null && (
                    <p className="text-xs text-gray-500 mt-1 flex items-center justify-end gap-1">
                      <span className="text-yellow-500">★</span>
                      <span className="font-semibold">{agent.avgFeedback}/5</span>
                      <span className="text-gray-400">user rating</span>
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Helpfulness Trends */}
      <div className="rounded-2xl border-2 border-gray-200 bg-white p-8 shadow-lg">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600">
            <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Helpfulness Over Time</h2>
        </div>
        {trends.length === 0 ? (
          <div className="text-center py-12">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 mb-4">
              <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
              </svg>
            </div>
            <p className="text-base font-medium text-gray-500">No trend data available</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trends}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="week" tick={{ fill: '#6b7280', fontSize: 12 }} />
              <YAxis domain={[0, 10]} tick={{ fill: '#6b7280', fontSize: 12 }} />
              <Tooltip contentStyle={{ borderRadius: '12px', border: '2px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
              <Line type="monotone" dataKey="avgScore" stroke="#3b82f6" strokeWidth={3} name="Avg Score" dot={{ r: 5, fill: '#3b82f6' }} activeDot={{ r: 7 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Dimension Breakdown */}
      <div className="rounded-2xl border-2 border-gray-200 bg-white p-8 shadow-lg">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-purple-600">
            <svg className="h-6 w-6 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Evaluation Dimension Breakdown</h2>
        </div>
        {dimensionData.length === 0 ? (
          <div className="text-center py-12">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 mb-4">
              <svg className="h-8 w-8 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
              </svg>
            </div>
            <p className="text-base font-medium text-gray-500">No dimension data available</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dimensionData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="dimension" tick={{ fill: '#6b7280', fontSize: 12 }} />
              <YAxis domain={[0, 10]} tick={{ fill: '#6b7280', fontSize: 12 }} />
              <Tooltip contentStyle={{ borderRadius: '12px', border: '2px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
              {comparison.map((agent, idx) => (
                <Bar
                  key={agent.agentName}
                  dataKey={agent.agentName}
                  fill={`hsl(${idx * 60}, 70%, 50%)`}
                  radius={[8, 8, 0, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Cost Tracking */}
      <div className="rounded-2xl border-2 border-gray-200 bg-white p-8 shadow-lg">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-green-600">
            <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Cost Tracking</h2>
        </div>
        {costs.length === 0 ? (
          <div className="text-center py-12">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 mb-4">
              <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-base font-medium text-gray-500">No cost data available</p>
          </div>
        ) : (
          <>
            <div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 p-6 border-2 border-blue-200">
                <div className="flex items-center gap-3 mb-2">
                  <svg className="h-5 w-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                  </svg>
                  <p className="text-sm font-semibold text-blue-700 uppercase tracking-wide">Total Tokens</p>
                </div>
                <p className="text-3xl font-bold text-blue-900">
                  {costs.reduce((sum, c) => sum + c.tokens, 0).toLocaleString()}
                </p>
              </div>
              <div className="rounded-xl bg-gradient-to-br from-green-50 to-green-100 p-6 border-2 border-green-200">
                <div className="flex items-center gap-3 mb-2">
                  <svg className="h-5 w-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                  </svg>
                  <p className="text-sm font-semibold text-green-700 uppercase tracking-wide">Total Cost</p>
                </div>
                <p className="text-3xl font-bold text-green-900">
                  ${costs.reduce((sum, c) => sum + c.cost, 0).toFixed(2)}
                </p>
              </div>
              <div className="rounded-xl bg-gradient-to-br from-purple-50 to-purple-100 p-6 border-2 border-purple-200">
                <div className="flex items-center gap-3 mb-2">
                  <svg className="h-5 w-5 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                  </svg>
                  <p className="text-sm font-semibold text-purple-700 uppercase tracking-wide">Avg / Review</p>
                </div>
                <p className="text-3xl font-bold text-purple-900">
                  ${(costs.reduce((sum, c) => sum + c.cost, 0) / costs.reduce((sum, c) => sum + c.count, 0)).toFixed(4)}
                </p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={costs}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 12 }} />
                <YAxis tick={{ fill: '#6b7280', fontSize: 12 }} />
                <Tooltip 
                  formatter={(value: any) => `$${Number(value).toFixed(4)}`}
                  contentStyle={{ borderRadius: '12px', border: '2px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Line type="monotone" dataKey="cost" stroke="#10b981" strokeWidth={3} name="Daily Cost ($)" dot={{ r: 5, fill: '#10b981' }} activeDot={{ r: 7 }} />
              </LineChart>
            </ResponsiveContainer>
          </>
        )}
      </div>

      {/* Feedback Correlation */}
      {comparison.some(c => c.avgFeedback !== null) && (
        <div className="rounded-2xl border-2 border-gray-200 bg-white p-8 shadow-lg">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-pink-500 to-pink-600">
              <svg className="h-6 w-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900">LLM vs. User Feedback Comparison</h2>
          </div>
          <div className="space-y-5">
            {comparison.filter(c => c.avgFeedback !== null).map((agent) => (
              <div key={agent.agentName} className="flex items-center gap-6 p-5 rounded-xl bg-gray-50 border-2 border-gray-100">
                <div className="w-40 text-base font-bold text-gray-800">{agent.agentName}</div>
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <div className="h-5 w-full rounded-full bg-gray-200 overflow-hidden">
                        <div
                          className="h-5 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500"
                          style={{ width: `${(agent.avgScore / 10) * 100}%` }}
                        />
                      </div>
                      <p className="mt-2 text-sm font-semibold text-gray-700">
                        LLM Score: <span className="text-blue-600">{agent.avgScore}/10</span>
                      </p>
                    </div>
                    <div className="flex-1">
                      <div className="h-5 w-full rounded-full bg-gray-200 overflow-hidden">
                        <div
                          className="h-5 rounded-full bg-gradient-to-r from-green-500 to-green-600 transition-all duration-500"
                          style={{ width: `${((agent.avgFeedback || 0) / 5) * 100}%` }}
                        />
                      </div>
                      <p className="mt-2 text-sm font-semibold text-gray-700">
                        User Rating: <span className="text-green-600">{agent.avgFeedback}/5</span>
                      </p>
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

