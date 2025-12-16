import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-client';
import ExcelJS from 'exceljs';

export async function GET(
  request: NextRequest,
  { params }: { params: { projectSlug: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'csv'; // csv or excel
    const status = searchParams.get('status') || 'all';
    const category = searchParams.get('category') || 'all';
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    const supabase = getSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database connection not available' },
        { status: 500 }
      );
    }

    // Get project by slug
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, name, slug')
      .eq('slug', params.projectSlug)
      .single();

    if (projectError || !project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Build query for posts
    let postsQuery = supabase
      .from('posts')
      .select(`
        id,
        title,
        description,
        status,
        author_email,
        author_name,
        vote_count,
        comment_count,
        created_at,
        updated_at,
        ai_category,
        ai_categorized,
        ai_confidence,
        ai_reasoning,
        boards!inner(
          name,
          projects!inner(
            name,
            slug
          )
        )
      `)
      .eq('project_id', project.id)
      .is('duplicate_of', null)
      .order('created_at', { ascending: false });

    // Apply filters
    if (status !== 'all') {
      postsQuery = postsQuery.eq('status', status);
    }

    if (category !== 'all') {
      postsQuery = postsQuery.eq('ai_category', category);
    }

    if (dateFrom) {
      postsQuery = postsQuery.gte('created_at', dateFrom);
    }

    if (dateTo) {
      postsQuery = postsQuery.lte('created_at', dateTo);
    }

    const { data: posts, error: postsError } = await postsQuery;

    if (postsError) {
      console.error('Error fetching posts:', postsError);
      return NextResponse.json(
        { error: 'Failed to fetch posts' },
        { status: 500 }
      );
    }

    // Get comments for posts
    const postIds = posts?.map(post => post.id) || [];
    let comments: any[] = [];

    if (postIds.length > 0) {
      const { data: commentsData, error: commentsError } = await supabase
        .from('comments')
        .select(`
          id,
          post_id,
          content,
          author_email,
          author_name,
          created_at
        `)
        .in('post_id', postIds)
        .order('created_at', { ascending: true });

      if (!commentsError) {
        comments = commentsData || [];
      }
    }

    // Get votes for posts
    let votes: any[] = [];

    if (postIds.length > 0) {
      const { data: votesData, error: votesError } = await supabase
        .from('votes')
        .select(`
          id,
          post_id,
          author_email:author_email,
          created_at
        `)
        .in('post_id', postIds)
        .order('created_at', { ascending: true });

      if (!votesError) {
        votes = votesData || [];
      }
    }

    // Format data for export
    const exportData = posts?.map(post => {
      const postComments = comments.filter(comment => comment.post_id === post.id);
      const postVotes = votes.filter(vote => vote.post_id === post.id);

      return {
        'Post ID': post.id,
        'Title': post.title,
        'Description': post.description,
        'Status': post.status,
        'Author Email': post.author_email || '',
        'Author Name': post.author_name || '',
        'Vote Count': post.vote_count || 0,
        'Comment Count': post.comment_count || 0,
        'AI Category': post.ai_category || '',
        'AI Categorized': post.ai_categorized ? 'Yes' : 'No',
        'AI Confidence': post.ai_confidence ? `${Math.round((post.ai_confidence || 0) * 100)}%` : '',
        'AI Reasoning': post.ai_reasoning || '',
        'Created At': new Date(post.created_at).toISOString(),
        'Updated At': new Date(post.updated_at).toISOString(),
        'Board Name': post.boards?.name || '',
        'Project Name': post.boards?.projects?.name || '',
        'Comments': postComments.map(c => `${c.author_name || c.author_email || 'Anonymous'}: ${c.content}`).join(' | '),
        'Voters': postVotes.map(v => v.author_email || 'Anonymous').join(', '),
        'Comment Count (Detailed)': postComments.length,
        'Vote Count (Detailed)': postVotes.length
      };
    }) || [];

    // Create filename with timestamp
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `${project.name.replace(/[^a-zA-Z0-9]/g, '_')}_feedback_${timestamp}`;

    if (format === 'excel') {
      // Create Excel workbook with multiple sheets using ExcelJS
      const workbook = new ExcelJS.Workbook();

      // Helper function to add data to worksheet
      const addDataToSheet = (sheetName: string, data: any[]) => {
        if (data.length === 0) return;
        const sheet = workbook.addWorksheet(sheetName);
        const headers = Object.keys(data[0]);
        sheet.addRow(headers);
        data.forEach(row => sheet.addRow(Object.values(row)));

        // Style header row
        const headerRow = sheet.getRow(1);
        headerRow.font = { bold: true };
        headerRow.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE0E0E0' }
        };
      };

      // Main posts sheet
      addDataToSheet('Feedback Posts', exportData);

      // Comments sheet
      if (comments.length > 0) {
        const commentsData = comments.map(comment => ({
          'Comment ID': comment.id,
          'Post ID': comment.post_id,
          'Author Email': comment.author_email || '',
          'Author Name': comment.author_name || '',
          'Content': comment.content,
          'Created At': new Date(comment.created_at).toISOString()
        }));
        addDataToSheet('Comments', commentsData);
      }

      // Votes sheet
      if (votes.length > 0) {
        const votesData = votes.map(vote => ({
          'Vote ID': vote.id,
          'Post ID': vote.post_id,
          'Voter Email': vote.author_email || '',
          'Created At': new Date(vote.created_at).toISOString()
        }));
        addDataToSheet('Votes', votesData);
      }

      // Summary sheet
      const summaryData = [
        { 'Metric': 'Total Posts', 'Value': posts?.length || 0 },
        { 'Metric': 'Total Comments', 'Value': comments.length },
        { 'Metric': 'Total Votes', 'Value': votes.length },
        { 'Metric': 'Export Date', 'Value': new Date().toISOString() },
        { 'Metric': 'Project', 'Value': project.name },
        { 'Metric': 'Filters Applied', 'Value': `Status: ${status}, Category: ${category}${dateFrom ? `, From: ${dateFrom}` : ''}${dateTo ? `, To: ${dateTo}` : ''}` }
      ];
      addDataToSheet('Summary', summaryData);

      // Generate Excel file
      const excelBuffer = await workbook.xlsx.writeBuffer();

      return new NextResponse(excelBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${filename}.xlsx"`,
        },
      });
    } else {
      // CSV format
      if (exportData.length === 0) {
        return NextResponse.json(
          { error: 'No data to export' },
          { status: 404 }
        );
      }

      // Convert to CSV
      const headers = Object.keys(exportData[0]);
      const csvRows = [
        headers.join(','),
        ...exportData.map(row =>
          headers.map(header => {
            const value = row[header as keyof typeof row];
            // Escape commas and quotes in CSV
            if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
          }).join(',')
        )
      ];

      const csvContent = csvRows.join('\n');

      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${filename}.csv"`,
        },
      });
    }

  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
