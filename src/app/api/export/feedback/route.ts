import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectSlug = searchParams.get('project_slug');
    const format = searchParams.get('format') || 'excel';
    const countOnly = searchParams.get('count_only') === 'true';
    const status = searchParams.get('status');
    const category = searchParams.get('category');
    const dateFrom = searchParams.get('date_from');
    const dateTo = searchParams.get('date_to');

    if (!projectSlug) {
      return NextResponse.json(
        { error: 'Project slug is required' },
        { status: 400 }
      );
    }

    // Get project
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, name')
      .eq('slug', projectSlug)
      .single();

    if (projectError || !project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Build query for posts
    let query = supabase
      .from('posts')
      .select(`
        id,
        title,
        description,
        status,
        category,
        author_name,
        author_email,
        created_at,
        updated_at,
        vote_count,
        comment_count
      `)
      .eq('project_id', project.id);

    // Apply filters
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }
    if (category && category !== 'all') {
      query = query.eq('category', category);
    }
    if (dateFrom) {
      query = query.gte('created_at', dateFrom);
    }
    if (dateTo) {
      query = query.lte('created_at', dateTo);
    }

    // Order by creation date
    query = query.order('created_at', { ascending: false });

    const { data: posts, error: postsError } = await query;

    if (postsError) {
      console.error('Error fetching posts:', postsError);
      return NextResponse.json(
        { error: 'Failed to fetch posts' },
        { status: 500 }
      );
    }

    // If count only, return count
    if (countOnly) {
      return NextResponse.json({ count: posts?.length || 0 });
    }

    // Prepare data for export
    const exportData = (posts || []).map(post => ({
      'ID': post.id,
      'Title': post.title,
      'Description': post.description,
      'Status': post.status,
      'Category': post.category,
      'Author Name': post.author_name,
      'Author Email': post.author_email,
      'Votes': post.vote_count || 0,
      'Comments': post.comment_count || 0,
      'Created At': new Date(post.created_at).toLocaleString(),
      'Updated At': new Date(post.updated_at).toLocaleString()
    }));

    if (format === 'csv') {
      // Generate CSV
      const csvContent = generateCSV(exportData);
      const filename = `${project.name}_feedback_${new Date().toISOString().split('T')[0]}.csv`;
      
      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${filename}"`
        }
      });
    } else {
      // Generate Excel
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      
      // Set column widths
      const columnWidths = [
        { wch: 10 }, // ID
        { wch: 30 }, // Title
        { wch: 50 }, // Description
        { wch: 15 }, // Status
        { wch: 20 }, // Category
        { wch: 20 }, // Author Name
        { wch: 30 }, // Author Email
        { wch: 10 }, // Votes
        { wch: 10 }, // Comments
        { wch: 20 }, // Created At
        { wch: 20 }  // Updated At
      ];
      worksheet['!cols'] = columnWidths;
      
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Feedback');
      
      const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      const filename = `${project.name}_feedback_${new Date().toISOString().split('T')[0]}.xlsx`;
      
      return new NextResponse(excelBuffer, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${filename}"`
        }
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

function generateCSV(data: any[]): string {
  if (data.length === 0) return '';
  
  const headers = Object.keys(data[0]);
  const csvRows = [headers.join(',')];
  
  for (const row of data) {
    const values = headers.map(header => {
      const value = row[header];
      // Escape quotes and wrap in quotes if contains comma, quote, or newline
      if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    });
    csvRows.push(values.join(','));
  }
  
  return csvRows.join('\n');
}
