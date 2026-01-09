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

// Update a specific client
export async function PUT(request: Request) {
  try {
    if (!supabase) {
      return NextResponse.json({ 
        error: 'Supabase not configured',
        details: 'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY'
      }, { status: 500 })
    }

    const body = await request.json()
    const { id, website } = body

    if (!id) {
      return NextResponse.json({ error: 'Client ID is required' }, { status: 400 })
    }

    // Update the client's website
    const { data, error } = await supabase
      .from('clients')
      .update({ website, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()

    if (error) {
      console.error('Error updating client:', error)
      return NextResponse.json({ 
        error: 'Failed to update client',
        details: error.message
      }, { status: 500 })
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    return NextResponse.json({ 
      success: true,
      client: data[0],
      message: `Client ${id} updated successfully`
    })

  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

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
    // Try to join with agencies table, but fallback to basic select if join fails
    // Use LEFT JOIN (outer join) to include clients even if they don't have an agency_id
    let result
    try {
      result = await supabase
        .from('clients')
        .select(`
          *,
          agencies!left(*)
        `)
        .limit(1000) // Explicit high limit to ensure we get everything
      
      // If join fails (agencies table might not exist), fallback to basic select
      if (result.error) {
        const errorMsg = result.error.message || ''
        const errorCode = result.error.code || ''
        
        // Check if error is related to agencies table not existing
        if (errorCode === 'PGRST116' || 
            errorMsg.includes('agencies') || 
            errorMsg.includes('relation') ||
            errorMsg.includes('does not exist')) {
          console.warn('Agencies table not found or join failed, falling back to basic select:', errorMsg)
          const fallbackResult = await supabase
            .from('clients')
            .select('*')
            .limit(1000)
          
          if (fallbackResult.error) {
            // If fallback also fails, use the original error
            error = result.error
            clients = []
          } else {
            // Fallback succeeded
            result = fallbackResult
            clients = result.data || []
            error = null
          }
        } else {
          // Different error, use it
          clients = result.data || []
          error = result.error
        }
      } else {
        // Join succeeded
        clients = result.data || []
        error = null
      }
    } catch (err) {
      console.warn('Exception with join query, falling back to basic select:', err)
      try {
        result = await supabase
          .from('clients')
          .select('*')
          .limit(1000)
        
        clients = result.data || []
        error = result.error
      } catch (fallbackErr) {
        console.error('Both queries failed:', fallbackErr)
        error = fallbackErr instanceof Error ? fallbackErr : new Error('Failed to fetch clients')
        clients = []
      }
    }
    
    count = totalCount
    
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
    
    // Log before transformation to see all clients
    console.log('Clients before transformation:', clientsArray.length)
    console.log('Client IDs before transformation:', clientsArray.map((c: any) => c.id))
    
    // Transform clients to map agencies relationship to agency property
    // Supabase returns it as 'agencies' (table name) but our interface expects 'agency'
    // Handle both cases: when join succeeds (agencies array) and when it doesn't (no agencies property)
    const transformedClients = clientsArray.map((client: any) => {
      // Remove the agencies property if it exists (we'll use agency instead)
      const { agencies, ...rest } = client
      
      // If agencies was returned from the join, use the first one
      if (agencies && Array.isArray(agencies) && agencies.length > 0) {
        return {
          ...rest,
          agency: agencies[0] // Take first agency (should only be one)
        }
      }
      
      // If agencies is a single object (Supabase sometimes returns it this way)
      if (agencies && typeof agencies === 'object' && !Array.isArray(agencies)) {
        return {
          ...rest,
          agency: agencies
        }
      }
      
      // No agency data, return client as-is (this is fine - client just doesn't have an agency)
      return rest
    })
    
    console.log('Clients after transformation:', transformedClients.length)
    console.log('Client IDs after transformation:', transformedClients.map((c: any) => c.id))

    // DO NOT remove duplicates - return ALL records exactly as Supabase returns them
    // Just sort them, but keep every single record
    const sortedClients = transformedClients.sort((a: any, b: any) => {
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

