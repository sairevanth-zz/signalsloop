import { getServiceRoleClient } from '@/lib/supabase-singleton';
import { JiraAPI, JiraVelocityReport } from '@/lib/jira/api';

export interface SyncVelocityParams {
  connectionId: string;
  boardId: string;
  projectId?: string;
}

export interface VelocitySyncResult {
  projectId: string;
  boardId: string;
  boardName?: string;
  sprintCount: number;
}

interface VelocityRow {
  project_id: string;
  jira_connection_id: string | null;
  board_id: string;
  board_name?: string;
  sprint_id?: string;
  sprint_name?: string;
  sprint_start_date?: string | null;
  sprint_end_date?: string | null;
  committed_points?: number | null;
  completed_points?: number | null;
  committed_issues?: number | null;
  completed_issues?: number | null;
  velocity_points?: number | null;
  source: string;
  metadata?: Record<string, any>;
}

/**
 * Sync Jira velocity for a board into team_velocity (and update team_capacity for planning).
 */
export async function syncJiraVelocity(params: SyncVelocityParams): Promise<VelocitySyncResult> {
  const supabase = getServiceRoleClient();
  const { connectionId, boardId } = params;

  // Look up connection to get project + cloud id
  const { data: connection, error: connError } = await supabase
    .from('jira_connections')
    .select('id, project_id, cloud_id, site_name')
    .eq('id', connectionId)
    .single();

  if (connError || !connection) {
    throw new Error('Jira connection not found or unauthorized');
  }

  const projectId = params.projectId || connection.project_id;

  const api = new JiraAPI(connectionId, connection.cloud_id);

  // Fetch board metadata (name) – ignore failures
  let boardName: string | undefined;
  try {
    const board = await api.getBoard(boardId);
    boardName = board?.name;
  } catch {
    boardName = undefined;
  }

  const report = await api.getBoardVelocity(boardId);
  const velocityRows = mapVelocityReport({
    report,
    projectId,
    connectionId: connection.id,
    boardId,
    boardName,
  });

  if (velocityRows.length === 0) {
    return { projectId, boardId, boardName, sprintCount: 0 };
  }

  // Upsert sprint velocity rows
  await supabase.from('team_velocity').upsert(velocityRows, {
    onConflict: 'project_id,sprint_id,board_id',
  });

  // Mirror into team_capacity to feed existing capacity/velocity calculations
  await Promise.all(
    velocityRows.map(row =>
      upsertTeamCapacityFromVelocity({
        projectId,
        sprintStart: row.sprint_start_date,
        sprintEnd: row.sprint_end_date,
        completedPoints: row.completed_points,
        completedIssues: row.completed_issues,
        boardName: row.board_name,
        sprintName: row.sprint_name,
      })
    )
  );

  return {
    projectId,
    boardId,
    boardName,
    sprintCount: velocityRows.length,
  };
}

function mapVelocityReport(args: {
  report: JiraVelocityReport;
  projectId: string;
  connectionId: string;
  boardId: string;
  boardName?: string;
}): VelocityRow[] {
  const { report, projectId, connectionId, boardId, boardName } = args;
  const sprintEntries = report?.sprints || [];
  const entryMap = report?.velocityStatEntries || {};

  return sprintEntries.map(sprint => {
    const entry = entryMap?.[String(sprint.id)] || {};
    const committed = entry.estimated?.value ?? null;
    const completed = entry.completed?.value ?? null;

    return {
      project_id: projectId,
      jira_connection_id: connectionId,
      board_id: boardId,
      board_name: boardName,
      sprint_id: sprint.id ? String(sprint.id) : undefined,
      sprint_name: sprint.name,
      sprint_start_date: sprint.startDate ? sprint.startDate.slice(0, 10) : null,
      sprint_end_date: sprint.endDate ? sprint.endDate.slice(0, 10) : null,
      committed_points: committed,
      completed_points: completed,
      committed_issues: null,
      completed_issues: null,
      velocity_points: completed,
      source: 'jira',
      metadata: {
        completeDate: sprint.completeDate,
        state: sprint.state,
      },
    };
  });
}

async function upsertTeamCapacityFromVelocity(params: {
  projectId: string;
  sprintStart?: string | null;
  sprintEnd?: string | null;
  completedPoints?: number | null;
  completedIssues?: number | null;
  boardName?: string;
  sprintName?: string;
}) {
  const supabase = getServiceRoleClient();

  const weekStart = params.sprintStart || params.sprintEnd;
  if (!weekStart) return;

  await supabase
    .from('team_capacity')
    .upsert(
      {
        project_id: params.projectId,
        week_start_date: weekStart,
        week_end_date: params.sprintEnd || weekStart,
        completed_story_points: params.completedPoints ?? null,
        completed_features: params.completedIssues ?? null,
        velocity_story_points: params.completedPoints ?? null,
        velocity_features: params.completedIssues ?? null,
        notes: `Imported from Jira sprint ${params.sprintName || ''} (${params.boardName || 'board'})`,
      },
      { onConflict: 'project_id,week_start_date' }
    );
}
