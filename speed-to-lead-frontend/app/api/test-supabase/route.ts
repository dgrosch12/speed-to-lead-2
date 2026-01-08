import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    // Test basic connection
    const { data, error } = await supabase
      .from('clients')
      .select('count')
      .limit(1)

    if (error) {
      return NextResponse.json({
        connected: false,
        error: error.message,
        code: error.code,
        hint: error.code === 'PGRST116' 
          ? 'The clients table does not exist. Please create it in Supabase using the SQL from the README.'
          : 'Check your Supabase credentials and connection.'
      }, { status: 500 })
    }

    return NextResponse.json({
      connected: true,
      message: 'Successfully connected to Supabase!',
      tables_exist: true
    })
  } catch (error) {
    return NextResponse.json({
      connected: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

