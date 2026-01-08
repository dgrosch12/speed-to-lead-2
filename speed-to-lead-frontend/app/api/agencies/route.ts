import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Use service role key for API routes to bypass RLS and get ALL records
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Create a Supabase client with service role key (bypasses RLS) or anon key as fallback
const supabase = supabaseUrl && supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null

// Get all agencies
export async function GET(request: Request) {
  try {
    if (!supabase) {
      return NextResponse.json({ 
        error: 'Supabase not configured',
        details: 'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY'
      }, { status: 500 })
    }

    const { data: agencies, error } = await supabase
      .from('agencies')
      .select('id, name, n8n_instance_url, created_at, updated_at')
      .order('name', { ascending: true })

    if (error) {
      console.error('Error fetching agencies:', error)
      return NextResponse.json({ 
        error: 'Failed to fetch agencies',
        details: error.message,
        code: error.code
      }, { status: 500 })
    }

    return NextResponse.json(
      { agencies: agencies || [] },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    )
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Create new agency
export async function POST(request: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json({ 
        error: 'Supabase not configured',
        details: 'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY'
      }, { status: 500 })
    }

    const body = await request.json()
    const { name, n8n_instance_url, n8n_api_key, openai_api_key, twilio_api_key } = body

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ 
        error: 'Agency name is required' 
      }, { status: 400 })
    }

    if (!n8n_instance_url || typeof n8n_instance_url !== 'string' || n8n_instance_url.trim().length === 0) {
      return NextResponse.json({ 
        error: 'n8n Instance URL is required' 
      }, { status: 400 })
    }

    if (!n8n_api_key || typeof n8n_api_key !== 'string' || n8n_api_key.trim().length === 0) {
      return NextResponse.json({ 
        error: 'n8n API Key is required' 
      }, { status: 400 })
    }

    if (!openai_api_key || typeof openai_api_key !== 'string' || openai_api_key.trim().length === 0) {
      return NextResponse.json({ 
        error: 'OpenAI API Key is required' 
      }, { status: 400 })
    }

    if (!twilio_api_key || typeof twilio_api_key !== 'string' || twilio_api_key.trim().length === 0) {
      return NextResponse.json({ 
        error: 'Twilio API Key is required' 
      }, { status: 400 })
    }

    const { data: agency, error } = await supabase
      .from('agencies')
      .insert({
        name: name.trim(),
        n8n_instance_url: n8n_instance_url.trim(),
        n8n_api_key: n8n_api_key.trim(),
        openai_api_key: openai_api_key.trim(),
        twilio_api_key: twilio_api_key.trim()
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating agency:', error)
      
      // Handle unique constraint violation
      if (error.code === '23505') {
        return NextResponse.json({ 
          error: 'An agency with this name already exists',
          details: error.message
        }, { status: 409 })
      }

      return NextResponse.json({ 
        error: 'Failed to create agency',
        details: error.message,
        code: error.code
      }, { status: 500 })
    }

    return NextResponse.json({ agency }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
