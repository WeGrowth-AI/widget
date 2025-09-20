import { createBrowserClient } from '@supabase/ssr'

// Environment check
console.log('Environment check:')
console.log('- NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Missing')
console.log('- NEXT_PUBLIC_SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing')
console.log('- SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Set' : '❌ Missing')

export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Test connection
export async function testSupabaseConnection() {
  try {
    const { data, error } = await supabase.from('User').select('count').limit(1)
    if (error) {
      console.error('Supabase connection error:', error)
      return false
    }
    console.log('✅ Supabase connection successful!')
    return true
  } catch (err) {
    console.error('❌ Supabase connection failed:', err)
    return false
  }
}