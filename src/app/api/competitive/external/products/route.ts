/**
 * API Route: Competitor Products Management
 * Handles CRUD operations for competitor products to monitor
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE!;

// GET: List competitor products for a project
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json(
        { success: false, error: 'projectId is required' },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all competitor products for this project
    const { data: products, error } = await supabase
      .from('competitor_products')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[External Products API] Error fetching products:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    // Get review counts for each product
    const productsWithStats = await Promise.all(
      (products || []).map(async (product) => {
        const { count } = await supabase
          .from('competitor_reviews')
          .select('*', { count: 'exact', head: true })
          .eq('competitor_product_id', product.id);

        const { data: reviews } = await supabase
          .from('competitor_reviews')
          .select('rating')
          .eq('competitor_product_id', product.id);

        const avgRating = reviews && reviews.length > 0
          ? reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length
          : 0;

        return {
          ...product,
          total_reviews: count || 0,
          avg_rating: avgRating,
        };
      })
    );

    return NextResponse.json({
      success: true,
      products: productsWithStats,
    });
  } catch (error: any) {
    console.error('[External Products API] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST: Add a new competitor product to monitor
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      project_id,
      product_name,
      company_name,
      platforms,
      g2_url,
      capterra_url,
      trustradius_url,
      category,
      description,
    } = body;

    if (!project_id || !product_name || !company_name || !platforms || platforms.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if project already has 5 competitors
    const { count } = await supabase
      .from('competitor_products')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', project_id);

    if (count && count >= 5) {
      return NextResponse.json(
        { success: false, error: 'Maximum of 5 competitor products allowed' },
        { status: 400 }
      );
    }

    // Extract product IDs from URLs if provided
    const g2_product_id = g2_url ? extractG2ProductId(g2_url) : null;
    const capterra_product_id = capterra_url ? extractCapterraProductId(capterra_url) : null;
    const trustradius_product_id = trustradius_url ? extractTrustRadiusProductId(trustradius_url) : null;

    // Create competitor product
    const { data: product, error } = await supabase
      .from('competitor_products')
      .insert({
        project_id,
        product_name,
        company_name,
        platforms,
        g2_url,
        g2_product_id,
        capterra_url,
        capterra_product_id,
        trustradius_url,
        trustradius_product_id,
        category,
        description,
        is_active: true,
        monitoring_enabled: true,
      })
      .select()
      .single();

    if (error) {
      console.error('[External Products API] Error creating product:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      product,
    });
  } catch (error: any) {
    console.error('[External Products API] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// PUT: Update competitor product
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { product_id, ...updates } = body;

    if (!product_id) {
      return NextResponse.json(
        { success: false, error: 'product_id is required' },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: product, error } = await supabase
      .from('competitor_products')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', product_id)
      .select()
      .single();

    if (error) {
      console.error('[External Products API] Error updating product:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      product,
    });
  } catch (error: any) {
    console.error('[External Products API] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// DELETE: Remove competitor product
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const productId = searchParams.get('productId');

    if (!productId) {
      return NextResponse.json(
        { success: false, error: 'productId is required' },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { error } = await supabase
      .from('competitor_products')
      .delete()
      .eq('id', productId);

    if (error) {
      console.error('[External Products API] Error deleting product:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error: any) {
    console.error('[External Products API] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// Helper functions to extract product IDs from URLs
function extractG2ProductId(url: string): string | null {
  const match = url.match(/g2\.com\/products\/([^\/]+)/);
  return match ? match[1] : null;
}

function extractCapterraProductId(url: string): string | null {
  const match = url.match(/capterra\.com\/p\/(\d+)/);
  return match ? match[1] : null;
}

function extractTrustRadiusProductId(url: string): string | null {
  const match = url.match(/trustradius\.com\/products\/([^\/]+)/);
  return match ? match[1] : null;
}
