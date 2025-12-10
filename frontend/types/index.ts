export interface User {
  id: number
  username: string
  email: string
  role: 'admin' | 'player'
  is_active: boolean
  created_at: string
}

export interface GameRule {
  id: number
  title: string
  description?: string
  rule_type: string
  content: Record<string, any>
  is_active: boolean
  created_at: string
}

export interface Scenario {
  id: number
  name: string
  description?: string
  image_url?: string
  phase: number
  order: number
  is_active: boolean
  created_at: string
}

export interface LLMConfiguration {
  id: number
  provider: 'openai' | 'anthropic'
  model_name: string
  is_active: boolean
  cost_per_token?: number
  max_tokens?: number
  temperature: number
  total_requests: number
  total_tokens: number
  total_cost: number
  avg_response_time: number
  created_at: string
}

export interface GameSession {
  id: number
  player_id: number
  room_id?: number
  current_scenario_id?: number
  current_phase: number
  status: 'active' | 'paused' | 'completed'
  llm_provider?: string
  llm_model?: string
  created_at: string
  last_activity: string
}

export interface SessionInteraction {
  id: number
  session_id: number
  player_input: string
  player_input_type: 'text' | 'audio'
  ai_response: string
  ai_response_audio_url?: string
  llm_provider?: string
  llm_model?: string
  tokens_used?: number
  cost?: number
  response_time?: number
  created_at: string
}

export interface Room {
  id: number
  name: string
  description?: string
  max_players: number
  is_active: boolean
  created_at: string
}

