import { NextRequest, NextResponse } from 'next/server';
import { secureAPI, validateAPIKey } from '@/lib/api-security';
import { secureQuery } from '@/lib/secure-supabase';
import { z } from 'zod';

/**
 * Example secure API route with Supabase integration
 * Demonstrates SQL injection prevention and secure database queries
 */

const CreatePostSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(5000),
  boardId: z.string().uuid(),
});

const PostIdSchema = z.object({
  id: z.string().uuid(),
});

type CreatePostBody = z.infer<typeof CreatePostSchema>;
type PostParams = z.infer<typeof PostIdSchema>;

/**
 * GET /api/example-secure-supabase
 * List posts with secure querying
 */
export const GET = secureAPI(
  async ({ query, user }) => {
    try {
      // Use secure query builder - automatic validation
      const { data: posts, error, count } = await secureQuery('posts')
        .list({
          limit: 50,
          sortColumn: 'created_at',
          sortDirection: 'desc',
          allowedSortColumns: ['created_at', 'updated_at', 'title', 'vote_count'],
          columns: ['id', 'title', 'content', 'vote_count', 'created_at', 'updated_at'],
        });

      if (error) {
        throw error;
      }

      return NextResponse.json({
        success: true,
        data: posts || [],
        count: count || 0,
      });
    } catch (error) {
      console.error('Error fetching posts:', error);
      return NextResponse.json(
        {
          error: 'Failed to fetch posts',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  },
  {
    enableRateLimit: true,
    requireAuth: true,
    authValidator: validateAPIKey,
  }
);

/**
 * POST /api/example-secure-supabase
 * Create a new post with validation and sanitization
 */
export const POST = secureAPI<CreatePostBody>(
  async ({ body, user }) => {
    try {
      // Verify board exists and user has access
      const boardQuery = await secureQuery('boards')
        .selectById(body!.boardId, ['id', 'project_id']);

      if (boardQuery.error || !boardQuery.data) {
        return NextResponse.json(
          { error: 'Board not found or access denied' },
          { status: 404 }
        );
      }

      // Insert post with automatic validation and sanitization
      const { data: newPost, error } = await secureQuery('posts').insert({
        title: body!.title,
        content: body!.content,
        board_id: body!.boardId,
        author_name: 'API User',
        author_email: user?.email || 'api@example.com',
        vote_count: 0,
        comments_count: 0,
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      if (error) {
        throw error;
      }

      return NextResponse.json(
        {
          success: true,
          data: newPost,
        },
        { status: 201 }
      );
    } catch (error) {
      console.error('Error creating post:', error);
      return NextResponse.json(
        {
          error: 'Failed to create post',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  },
  {
    enableRateLimit: true,
    enableCSRF: true,
    requireAuth: true,
    authValidator: validateAPIKey,
    bodySchema: CreatePostSchema,
    sanitizeInput: true,
  }
);

/**
 * GET /api/example-secure-supabase/[id]
 * Get a single post by ID with validation
 */
export const getPostById = secureAPI<never, PostParams>(
  async ({ params }) => {
    try {
      // Secure query with UUID validation
      const { data: post, error } = await secureQuery('posts')
        .selectById(params!.id, [
          'id',
          'title',
          'content',
          'vote_count',
          'comments_count',
          'status',
          'created_at',
          'updated_at',
        ]);

      if (error || !post) {
        return NextResponse.json(
          { error: 'Post not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: post,
      });
    } catch (error) {
      console.error('Error fetching post:', error);
      return NextResponse.json(
        {
          error: 'Failed to fetch post',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  },
  {
    enableRateLimit: true,
    requireAuth: true,
    authValidator: validateAPIKey,
    paramsSchema: PostIdSchema,
  }
);

/**
 * PUT /api/example-secure-supabase/[id]
 * Update a post with validation
 */
export const updatePost = secureAPI<Partial<CreatePostBody>, PostParams>(
  async ({ body, params }) => {
    try {
      // Secure update with validation
      const { data: updatedPost, error } = await secureQuery('posts').update(
        params!.id,
        {
          ...(body!.title && { title: body!.title }),
          ...(body!.content && { content: body!.content }),
          updated_at: new Date().toISOString(),
        }
      );

      if (error || !updatedPost) {
        return NextResponse.json(
          { error: 'Post not found or update failed' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: updatedPost,
      });
    } catch (error) {
      console.error('Error updating post:', error);
      return NextResponse.json(
        {
          error: 'Failed to update post',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  },
  {
    enableRateLimit: true,
    enableCSRF: true,
    requireAuth: true,
    authValidator: validateAPIKey,
    bodySchema: CreatePostSchema.partial(),
    paramsSchema: PostIdSchema,
    sanitizeInput: true,
  }
);

/**
 * DELETE /api/example-secure-supabase/[id]
 * Delete a post with security checks
 */
export const deletePost = secureAPI<never, PostParams>(
  async ({ params }) => {
    try {
      // Secure delete with UUID validation
      const { error } = await secureQuery('posts').delete(params!.id);

      if (error) {
        return NextResponse.json(
          { error: 'Post not found or delete failed' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Post deleted successfully',
        postId: params!.id,
      });
    } catch (error) {
      console.error('Error deleting post:', error);
      return NextResponse.json(
        {
          error: 'Failed to delete post',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  },
  {
    enableRateLimit: true,
    enableCSRF: true,
    requireAuth: true,
    authValidator: validateAPIKey,
    paramsSchema: PostIdSchema,
  }
);
