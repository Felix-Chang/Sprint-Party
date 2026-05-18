import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

let _getToken = null

export function setGetToken(fn) {
  _getToken = fn
}

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  async accessToken() {
    return _getToken ? await _getToken() : null
  },
})
