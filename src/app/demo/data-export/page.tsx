'use client';

import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, FileText, Info } from 'lucide-react';

const SAMPLE_ROWS = [
  {
    title: 'Dark mode for dashboard',
    status: 'Planned',
    votes: 128,
    lastUpdated: '2024-01-12',
    summary: 'Customers request better nighttime usability with dark theme.'
  },
  {
    title: 'Slack message actions',
    status: 'In Progress',
    votes: 94,
    lastUpdated: '2024-01-08',
    summary: 'Allow voting and linking posts directly from Slack threads.'
  },
  {
    title: 'Advanced analytics export',
    status: 'Under Review',
    votes: 61,
    lastUpdated: '2024-01-03',
    summary: 'Push SignalsLoop reports to Google Sheets via CSV export.'
  }
];

export default function DataExportDemoPage() {
  const totalVotes = useMemo(
    () => SAMPLE_ROWS.reduce((sum, row) => sum + row.votes, 0),
    []
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-12">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="space-y-3 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-2 border border-white/60 shadow-sm">
            <FileText className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-slate-700">
              Demo walkthrough
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-semibold text-slate-900">
            See how data export works
          </h1>
          <p className="text-sm sm:text-base text-slate-600 max-w-xl mx-auto">
            SignalsLoop Pro lets you export every feedback item, comment, and vote in seconds.
            This demo shows the structure and insights you&apos;ll receive.
          </p>
          <Button
            asChild
            size="lg"
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          >
            <a href="/demo-data-export.csv" download>
              <Download className="w-5 h-5 mr-2" />
              Download sample CSV
            </a>
          </Button>
        </div>

        <Card className="bg-white/90 backdrop-blur-sm border-white/70 shadow-xl">
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-xl text-slate-900">
                Sample export preview
              </CardTitle>
              <p className="text-sm text-slate-600">
                Each row maps to one feedback post with status, votes, and summaries ready for spreadsheets.
              </p>
            </div>
            <div className="inline-flex items-center gap-2 text-xs text-blue-700 bg-blue-100/70 border border-blue-200 rounded-full px-3 py-1">
              <Info className="w-4 h-4" />
              Demo data only
            </div>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="min-w-full text-left border border-slate-200 rounded-lg overflow-hidden">
              <thead>
                <tr className="bg-slate-100/80 text-slate-600 uppercase text-xs tracking-wider">
                  <th className="py-3 px-4 font-medium">Title</th>
                  <th className="py-3 px-4 font-medium">Status</th>
                  <th className="py-3 px-4 font-medium">Votes</th>
                  <th className="py-3 px-4 font-medium">Last Updated</th>
                  <th className="py-3 px-4 font-medium">Summary</th>
                </tr>
              </thead>
              <tbody>
                {SAMPLE_ROWS.map((row, index) => (
                  <tr
                    key={row.title}
                    className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}
                  >
                    <td className="py-3 px-4 text-sm font-medium text-slate-900">
                      {row.title}
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-700">
                      {row.status}
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-700">
                      {row.votes}
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-700">
                      {row.lastUpdated}
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-600 max-w-xs">
                      {row.summary}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card className="bg-white/90 backdrop-blur-sm border-white/70 shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-slate-900">
              What&apos;s included in the export?
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-2">
              <h3 className="text-sm font-semibold text-slate-900">
                Feedback posts
              </h3>
              <p className="text-sm text-slate-600">
                Title, description, status, category, created / updated dates, and author details.
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-2">
              <h3 className="text-sm font-semibold text-slate-900">
                Votes &amp; comments
              </h3>
              <p className="text-sm text-slate-600">
                Total votes, voters list with email attribution, and comment history grouped by post.
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-2">
              <h3 className="text-sm font-semibold text-slate-900">
                AI summaries
              </h3>
              <p className="text-sm text-slate-600">
                Optional AI-generated insight column to help prioritize roadmap decisions.
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-2">
              <h3 className="text-sm font-semibold text-slate-900">
                Ready for Excel &amp; Sheets
              </h3>
              <p className="text-sm text-slate-600">
                CSV format opens instantly in Excel, Google Sheets, or BI tools for deeper reporting.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="text-center space-y-3">
          <p className="text-sm text-slate-600">
            This demo uses a handful of rows, but full exports include everything in your SignalsLoop workspace.
          </p>
          <div className="inline-flex items-center gap-2 rounded-full bg-white/70 px-4 py-2 border border-white/60 text-xs text-slate-600">
            <span>Total votes represented</span>
            <span className="font-semibold text-slate-900">{totalVotes}</span>
          </div>
          <p className="text-sm text-slate-500">
            Questions about data export?{' '}
            <a href="mailto:support@signalsloop.com" className="text-blue-600 underline">
              Email our team
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
