/**
 * Export utilities for Go/No-Go Dashboard
 * Generates PDF and Excel exports
 */

import type { LaunchBoardWithDetails } from '@/types/launch';
import { DIMENSION_CONFIG } from '@/types/launch';

// Generate CSV/Excel export
export function exportToExcel(board: LaunchBoardWithDetails): void {
    const rows: string[][] = [];

    // Header
    rows.push(['Go/No-Go Launch Report']);
    rows.push(['']);
    rows.push(['Title', board.title]);
    rows.push(['Target Date', board.target_date ? new Date(board.target_date).toLocaleDateString() : 'Not set']);
    rows.push(['Overall Score', (board.overall_score || 0).toString() + '%']);
    rows.push(['Decision', board.decision ? board.decision.replace('_', '-').toUpperCase() : 'Pending']);
    rows.push(['']);

    // Dimensions
    rows.push(['DIMENSION SCORES']);
    rows.push(['Dimension', 'Score', 'Notes']);
    board.dimensions.forEach(dim => {
        const config = DIMENSION_CONFIG[dim.dimension_type];
        rows.push([
            config.name,
            (dim.ai_score || 0).toString(),
            dim.team_notes || ''
        ]);
    });
    rows.push(['']);

    // Risks
    rows.push(['RISKS & BLOCKERS']);
    rows.push(['Risk', 'Severity', 'Status', 'Mitigation']);
    board.risks.forEach(risk => {
        rows.push([
            risk.title,
            risk.severity.toUpperCase(),
            risk.status,
            risk.mitigation || ''
        ]);
    });
    rows.push(['']);

    // Checklist
    rows.push(['LAUNCH CHECKLIST']);
    rows.push(['Item', 'Status', 'Owner']);
    board.checklist_items.forEach(item => {
        rows.push([
            item.title,
            item.completed ? 'Complete' : 'Pending',
            item.owner || ''
        ]);
    });
    rows.push(['']);

    // Stakeholder Votes
    rows.push(['STAKEHOLDER VOTES']);
    rows.push(['Name', 'Role', 'Vote', 'Comment']);
    board.votes.forEach(vote => {
        rows.push([
            vote.name,
            vote.role || '',
            vote.vote ? vote.vote.replace('_', '-').toUpperCase() : 'Pending',
            vote.comment || ''
        ]);
    });

    // Vote summary
    const goVotes = board.votes.filter(v => v.vote === 'go').length;
    const noGoVotes = board.votes.filter(v => v.vote === 'no_go').length;
    const conditionalVotes = board.votes.filter(v => v.vote === 'conditional').length;
    rows.push(['']);
    rows.push(['Vote Summary', `GO: ${goVotes}`, `CONDITIONAL: ${conditionalVotes}`, `NO-GO: ${noGoVotes}`]);

    // Notes
    if (board.decision_notes) {
        rows.push(['']);
        rows.push(['NOTES & CONTEXT']);
        rows.push([board.decision_notes]);
    }

    // Convert to CSV
    const csv = rows.map(row =>
        row.map(cell => `"${(cell || '').replace(/"/g, '""')}"`).join(',')
    ).join('\n');

    // Download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `go-no-go-${board.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
}

// Generate PDF export (simplified HTML -> Print)
export function exportToPDF(board: LaunchBoardWithDetails): void {
    const goVotes = board.votes.filter(v => v.vote === 'go').length;
    const noGoVotes = board.votes.filter(v => v.vote === 'no_go').length;
    const conditionalVotes = board.votes.filter(v => v.vote === 'conditional').length;
    const checklistComplete = board.checklist_items.filter(i => i.completed).length;
    const checklistTotal = board.checklist_items.length;
    const openRisks = board.risks.filter(r => r.status === 'open').length;

    const decisionColor = board.decision === 'go' ? '#22c55e' :
        board.decision === 'no_go' ? '#ef4444' :
            board.decision === 'conditional' ? '#eab308' : '#6b7280';

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Go/No-Go Report: ${board.title}</title>
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px; color: #1a1a1a; }
            h1 { font-size: 24px; margin-bottom: 8px; }
            h2 { font-size: 16px; color: #666; margin-top: 32px; margin-bottom: 12px; border-bottom: 1px solid #ddd; padding-bottom: 4px; }
            .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
            .score-box { text-align: center; padding: 16px 24px; border: 2px solid #ddd; border-radius: 12px; }
            .score { font-size: 48px; font-weight: bold; color: #14b8a6; }
            .decision { display: inline-block; padding: 8px 16px; border-radius: 6px; font-weight: bold; color: white; background: ${decisionColor}; font-size: 14px; }
            .meta { color: #666; font-size: 12px; margin-top: 4px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 16px; }
            th, td { padding: 8px; text-align: left; border-bottom: 1px solid #eee; }
            th { background: #f5f5f5; font-weight: 600; }
            .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 600; }
            .badge-go { background: #dcfce7; color: #166534; }
            .badge-nogo { background: #fee2e2; color: #991b1b; }
            .badge-cond { background: #fef3c7; color: #92400e; }
            .badge-pending { background: #f1f5f9; color: #64748b; }
            .badge-high { background: #fee2e2; color: #991b1b; }
            .badge-medium { background: #fef3c7; color: #92400e; }
            .badge-low { background: #dcfce7; color: #166534; }
            .vote-summary { display: flex; gap: 24px; margin: 16px 0; }
            .vote-box { text-align: center; padding: 12px 24px; border-radius: 8px; }
            .vote-box.go { background: #dcfce7; }
            .vote-box.nogo { background: #fee2e2; }
            .vote-box.cond { background: #fef3c7; }
            .vote-count { font-size: 24px; font-weight: bold; }
            .vote-label { font-size: 10px; color: #666; margin-top: 4px; }
            .notes { background: #f8fafc; padding: 12px; border-radius: 6px; font-size: 12px; margin-top: 16px; }
            .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #ddd; font-size: 10px; color: #999; }
            @media print { body { padding: 20px; } }
        </style>
    </head>
    <body>
        <div class="header">
            <div>
                <h1>🚀 ${board.title}</h1>
                <p class="meta">Target: ${board.target_date ? new Date(board.target_date).toLocaleDateString() : 'Not set'}</p>
                <p class="meta">Generated: ${new Date().toLocaleString()}</p>
            </div>
            <div class="score-box">
                <div class="score">${board.overall_score || 0}%</div>
                <div style="color: #666; font-size: 10px; margin-bottom: 8px;">Readiness</div>
                <span class="decision">${board.decision ? board.decision.replace('_', '-').toUpperCase() : 'PENDING'}</span>
            </div>
        </div>

        <h2>📊 Dimension Scores</h2>
        <table>
            <tr><th>Dimension</th><th>Score</th><th>Team Notes</th></tr>
            ${board.dimensions.map(dim => {
        const config = DIMENSION_CONFIG[dim.dimension_type];
        return `<tr>
                        <td>${config.icon} ${config.name}</td>
                        <td><strong>${dim.ai_score || 0}</strong></td>
                        <td>${dim.team_notes || '-'}</td>
                    </tr>`;
    }).join('')}
        </table>

        <h2>👥 Stakeholder Votes</h2>
        <div class="vote-summary">
            <div class="vote-box go"><div class="vote-count">${goVotes}</div><div class="vote-label">GO</div></div>
            <div class="vote-box cond"><div class="vote-count">${conditionalVotes}</div><div class="vote-label">CONDITIONAL</div></div>
            <div class="vote-box nogo"><div class="vote-count">${noGoVotes}</div><div class="vote-label">NO-GO</div></div>
        </div>
        <table>
            <tr><th>Stakeholder</th><th>Role</th><th>Vote</th><th>Comment</th></tr>
            ${board.votes.map(vote => `
                <tr>
                    <td><strong>${vote.name}</strong></td>
                    <td>${vote.role || '-'}</td>
                    <td>${vote.vote ? `<span class="badge badge-${vote.vote === 'go' ? 'go' : vote.vote === 'no_go' ? 'nogo' : 'cond'}">${vote.vote.replace('_', '-').toUpperCase()}</span>` : '<span class="badge badge-pending">PENDING</span>'}</td>
                    <td><em>${vote.comment || '-'}</em></td>
                </tr>
            `).join('')}
        </table>

        <h2>✅ Launch Checklist (${checklistComplete}/${checklistTotal})</h2>
        <table>
            <tr><th>Item</th><th>Status</th><th>Owner</th></tr>
            ${board.checklist_items.map(item => `
                <tr>
                    <td>${item.title}</td>
                    <td>${item.completed ? '✅ Complete' : '⏳ Pending'}</td>
                    <td>${item.owner || '-'}</td>
                </tr>
            `).join('')}
        </table>

        <h2>⚠️ Risks & Blockers (${openRisks} open)</h2>
        <table>
            <tr><th>Risk</th><th>Severity</th><th>Status</th><th>Mitigation</th></tr>
            ${board.risks.map(risk => `
                <tr>
                    <td>${risk.title}</td>
                    <td><span class="badge badge-${risk.severity}">${risk.severity.toUpperCase()}</span></td>
                    <td>${risk.status}</td>
                    <td>${risk.mitigation || '-'}</td>
                </tr>
            `).join('')}
        </table>

        ${board.decision_notes ? `
        <h2>📝 Notes & Context</h2>
        <div class="notes">${board.decision_notes}</div>
        ` : ''}

        <div class="footer">
            Generated by SignalsLoop • Go/No-Go Launch Dashboard
        </div>
    </body>
    </html>`;

    // Open in new window for printing
    const printWindow = window.open('', '_blank');
    if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
        setTimeout(() => {
            printWindow.print();
        }, 500);
    }
}
