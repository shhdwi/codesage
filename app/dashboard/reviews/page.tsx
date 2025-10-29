"use client";

import { useState, useEffect } from "react";

interface Review {
  id: string;
  prNumber: number;
  filePath: string;
  lineNumber: number;
  comment: string;
  severity: number;
  postedAt: string;
  agent: { id: string; name: string };
  repo: { id: string; fullName: string };
  evaluations: Array<{ scores: Record<string, number> }>;
  feedbacks: Array<{ rating: number }>;
}

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: "",
    severity: "",
    agentId: "",
  });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchReviews();
  }, [filters, page]);

  const fetchReviews = async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: page.toString(),
      ...(filters.search && { search: filters.search }),
      ...(filters.severity && { severity: filters.severity }),
      ...(filters.agentId && { agentId: filters.agentId }),
    });

    const response = await fetch(`/api/reviews?${params}`);
    const data = await response.json();
    
    if (!response.ok) {
      console.error('Failed to fetch reviews:', data);
      setReviews([]);
      setTotalPages(1);
      setLoading(false);
      return;
    }
    
    setReviews(data.reviews || []);
    setTotalPages(data.pagination?.totalPages || 1);
    setLoading(false);
  };

  const submitFeedback = async (reviewId: string, rating: number) => {
    await fetch(`/api/reviews/${reviewId}/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating }),
    });
    fetchReviews();
  };

  const calculateAvgScore = (evaluations: Array<{ scores: Record<string, number> }>) => {
    if (evaluations.length === 0) return 0;
    const allScores = evaluations.flatMap(e => Object.values(e.scores));
    return (allScores.reduce((a, b) => a + b, 0) / allScores.length).toFixed(1);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Review History</h1>
        <p className="mt-2 text-gray-600">Browse and search all code reviews</p>
      </div>

      {/* Filters */}
      <div className="rounded-lg bg-white p-4 shadow">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <input
            type="text"
            placeholder="Search file path or comment..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          <select
            value={filters.severity}
            onChange={(e) => setFilters({ ...filters, severity: e.target.value })}
            className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">All Severities</option>
            <option value="1">Severity 1</option>
            <option value="2">Severity 2</option>
            <option value="3">Severity 3</option>
            <option value="4">Severity 4</option>
            <option value="5">Severity 5</option>
          </select>
          <button
            onClick={() => setFilters({ search: "", severity: "", agentId: "" })}
            className="rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-300"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Reviews List */}
      {loading ? (
        <div className="py-12 text-center text-gray-500">Loading...</div>
      ) : reviews.length === 0 ? (
        <div className="rounded-lg bg-white p-12 text-center shadow">
          <p className="text-gray-500">No reviews found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <div key={review.id} className="rounded-lg bg-white p-6 shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-medium text-gray-900">
                      {review.repo.fullName} #{review.prNumber}
                    </h3>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      review.severity >= 4 ? 'bg-red-100 text-red-800' :
                      review.severity >= 3 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      Severity {review.severity}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-gray-500">
                    {review.agent.name} • {review.filePath}:{review.lineNumber}
                  </p>
                  <p className="mt-3 text-sm text-gray-700">{review.comment}</p>
                  
                  {review.evaluations.length > 0 && (
                    <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
                      <span>
                        Avg Score: <strong>{calculateAvgScore(review.evaluations)}/10</strong>
                      </span>
                      {Object.entries(review.evaluations[0].scores).map(([dim, score]) => (
                        <span key={dim}>
                          {dim}: <strong>{score}/10</strong>
                        </span>
                      ))}
                    </div>
                  )}
                  
                  <p className="mt-2 text-xs text-gray-400">
                    {new Date(review.postedAt).toLocaleString()}
                  </p>
                </div>

                {/* Feedback */}
                <div className="ml-6 flex flex-col items-center gap-2">
                  <p className="text-xs text-gray-500">Helpful?</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => submitFeedback(review.id, 5)}
                      className="text-lg hover:scale-110 transition-transform"
                      title="Very helpful"
                    >
                      👍
                    </button>
                    <button
                      onClick={() => submitFeedback(review.id, 1)}
                      className="text-lg hover:scale-110 transition-transform"
                      title="Not helpful"
                    >
                      👎
                    </button>
                  </div>
                  {review.feedbacks.length > 0 && (
                    <p className="text-xs text-gray-500">
                      {review.feedbacks.length} feedback(s)
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded-md bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow hover:bg-gray-50 disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-sm text-gray-700">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="rounded-md bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow hover:bg-gray-50 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

