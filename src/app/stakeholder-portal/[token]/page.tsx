'use client';

import React, { useEffect, useState } from 'react';

interface RoadmapItem {
  id: string;
  priority_level: string;
  priority_score: number;
  recommendation_text: string;
  status: string;
}

export default function StakeholderPortal({ params }: { params: { token: string } }) {
  const { token } = params;
  const [loading, setLoading] = useState(true);
  const [projectName, setProjectName] = useState('');
  const [stakeholderName, setStakeholderName] = useState('');
  const [roadmap, setRoadmap] = useState<RoadmapItem[]>([]);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [asking, setAsking] = useState(false);

  useEffect(() => {
    const loadPortal = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/stakeholders/portal?token=${token}`);
        const json = await res.json();
        if (!json.success) {
          setError(json.error || 'Failed to load portal');
          return;
        }
        setProjectName(json.project?.name || 'Project');
        setStakeholderName(json.stakeholder?.name || '');
        setRoadmap(json.roadmap || []);
      } catch (err) {
        setError('Failed to load portal');
      } finally {
        setLoading(false);
      }
    };

    loadPortal();
  }, [token]);

  const ask = async () => {
    if (!question.trim()) return;
    setAsking(true);
    setError('');
    setAnswer('');
    try {
      const res = await fetch('/api/stakeholders/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, question }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error || 'Failed to answer');
      } else {
        setAnswer(json.answer || '');
      }
    } catch (err) {
      setError('Failed to answer');
    } finally {
      setAsking(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div>Loading portal...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="text-red-400">{error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-5xl p-6 space-y-6">
        <div className="flex flex-col gap-1">
          <span className="text-sm text-slate-500">Stakeholder Portal</span>
          <h1 className="text-3xl font-bold">{projectName}</h1>
          {stakeholderName && <p className="text-slate-400">Welcome, {stakeholderName}</p>}
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 space-y-3">
          <div className="flex flex-col gap-2">
            <label className="text-sm text-slate-300">Ask AI about this roadmap</label>
            <textarea
              className="w-full rounded border border-slate-700 bg-slate-950 p-3 text-sm"
              rows={3}
              placeholder="e.g., What are the top priorities shipping next quarter?"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
            />
            <button
              onClick={ask}
              disabled={asking || !question.trim()}
              className="self-start rounded bg-purple-600 px-4 py-2 text-sm font-semibold hover:bg-purple-700 disabled:opacity-50"
            >
              {asking ? 'Thinking…' : 'Ask'}
            </button>
            {answer && (
              <div className="rounded border border-slate-800 bg-slate-950 p-3 text-sm text-slate-100">
                {answer}
              </div>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Top Roadmap Items</h2>
            <span className="text-xs text-slate-500">auto-updated</span>
          </div>
          {roadmap.length === 0 ? (
            <div className="text-sm text-slate-500">No roadmap items available yet.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {roadmap.map((item) => (
                <div key={item.id} className="rounded-lg border border-slate-800 bg-slate-950 p-3 space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span className="uppercase tracking-wide">{item.priority_level}</span>
                    <span className="text-slate-500">Score {Math.round(item.priority_score)}</span>
                  </div>
                  <p className="text-sm text-slate-100">
                    {item.recommendation_text || 'No description'}
                  </p>
                  <div className="text-xs text-slate-500">Status: {item.status || 'suggested'}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
