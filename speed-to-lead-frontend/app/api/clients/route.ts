import { NextResponse } from 'next/server'
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

// Get all clients
export async function GET(request: Request) {
  try {
    if (!supabase) {
      return NextResponse.json({ 
        error: 'Supabase not configured',
        details: 'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY'
      }, { status: 500 })
    }

    // Simply fetch ALL clients - no filtering, no conditions, just get everything
    // Explicitly request a high limit to ensure we get all records (Supabase default might be limiting)
    let clients: any[] = []
    let count: number | null = null
    let error: any = null
    
    // First, get the count to know how many we expect
    const { count: totalCount } = await supabase
      .from('clients')
      .select('*', { count: 'exact', head: true })
    
    console.log('Expected total clients from count:', totalCount)
    console.log('=== CLIENT FETCH - Fresh Query ===', new Date().toISOString())
    
    // Then fetch ALL with explicit limit - force fresh query
    const result = await supabase
      .from('clients')
      .select('*')
      .limit(1000) // Explicit high limit to ensure we get everything
    
    clients = result.data || []
    count = totalCount
    error = result.error
    
    console.log(`Query returned ${clients.length} records (expected ${count})`)

    if (error) {
      console.error('Error fetching clients:', error)
      return NextResponse.json({ 
        error: 'Failed to fetch clients',
        details: error.message,
        code: error.code
      }, { status: 500 })
    }

    const clientsArray = clients || []
    console.log('=== CLIENT FETCH SUMMARY ===')
    console.log('Supabase reported count:', count)
    console.log('Actual array length:', clientsArray.length)
    
    // Check for duplicate IDs that might cause overwrites
    const idCounts = new Map<string, number>()
    clientsArray.forEach((c: any) => {
      const id = c.id || c.name || 'NO-ID'
      idCounts.set(id, (idCounts.get(id) || 0) + 1)
    })
    
    const duplicates = Array.from(idCounts.entries()).filter(([_, count]) => count > 1)
    if (duplicates.length > 0) {
      console.warn('⚠️ Found duplicate client IDs:', duplicates)
    }
    
    // Log all client IDs - check specifically for Grosch HVAC
    const allIds = clientsArray.map((c: any) => ({ id: c.id, name: c.name || 'NO-NAME' }))
    console.log('All client records:', JSON.stringify(allIds, null, 2))
    
    // Explicitly check for Grosch HVAC
    const groschHvac = clientsArray.find((c: any) => 
      (c.id && c.id.toLowerCase().includes('grosch')) || 
      (c.name && c.name.toLowerCase().includes('grosch'))
    )
    if (groschHvac) {
      console.error('⚠️ FOUND GROSCH HVAC IN SUPABASE QUERY:', groschHvac)
    } else {
      console.log('✅ Grosch HVAC NOT found in Supabase query (correct)')
    }
    
    if (count !== undefined && count !== clientsArray.length) {
      console.error(`⚠️ MISMATCH: Supabase count=${count} but array length=${clientsArray.length}`)
      console.error(`⚠️ Missing ${count - clientsArray.length} client(s)`)
      
      // Try a separate query just for IDs to see if we get all 24
      try {
        const { data: idData, error: idError } = await supabase
          .from('clients')
          .select('id, name')
        
        if (!idError && idData) {
          console.log('Direct ID query returned:', idData.length, 'records')
          const receivedIds = new Set(clientsArray.map((c: any) => c.id))
          const allReceivedIds = new Set((idData || []).map((c: any) => c.id))
          const missing = (idData || []).filter((c: any) => !receivedIds.has(c.id))
          if (missing.length > 0) {
            console.error('⚠️ Missing client ID(s):', missing)
          }
        }
      } catch (e) {
        console.error('Could not identify missing clients:', e)
      }
    }
    
    // DO NOT remove duplicates - return ALL records exactly as Supabase returns them
    // Just sort them, but keep every single record
    const sortedClients = clientsArray.sort((a: any, b: any) => {
      const aDate = a.created_at ? new Date(a.created_at).getTime() : 0
      const bDate = b.created_at ? new Date(b.created_at).getTime() : 0
      return bDate - aDate // Descending order (newest first)
    })

    console.log('Returning', sortedClients.length, 'clients to frontend')
    console.log('Final client IDs being returned:', sortedClients.map((c: any) => c.id || c.name || 'NO-ID'))
    console.log('===========================')

    // Disable caching to ensure fresh data
    return NextResponse.json(
      { clients: sortedClients },
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

