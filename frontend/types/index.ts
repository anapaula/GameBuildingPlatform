export interface User {
  id: number
  username: string
  email: string
  role: 'ADMIN' | 'FACILITATOR' | 'PLAYER'
  is_active: boolean
  created_at: string
}

export interface Invitation {
  id: number
  email: string
  role: 'FACILITATOR' | 'PLAYER'
  inviter_id: number
  token: string
  status: 'pending' | 'accepted' | 'expired'
  expires_at?: string
  accepted_at?: string
  created_at: string
}

export interface FacilitatorPlayer {
  id: number
  player_id: number
  player_username: string
  player_email: string
  created_at: string
}

export interface PlayerGameAccess {
  id: number
  player_id: number
  game_id: number
  game_title: string
  granted_by: number
  created_at: string
}

export interface GameRule {
  id: number
  game_id: number
  title: string
  description?: string
  rule_type: string
  content: Record<string, any>
  is_active: boolean
  created_at: string
}

export interface Game {
  id: number
  title: string
  description?: string
  cover_image_url?: string
  is_active: boolean
  created_at: string
  updated_at?: string
}

export interface Scenario {
  id: number
  game_id: number
  name: string
  description?: string
  image_url?: string
  video_url?: string
  file_url?: string
  file_content?: string
  phase: number
  order: number
  is_active: boolean
  created_at: string
}

export interface LLMConfiguration {
  id: number
  game_id: number
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
  game_id: number
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

export interface PlayerRoom {
  id: number
  name: string
  description?: string
  max_players: number
  is_active: boolean
  created_at: string
  member_count: number
  sessions: Array<{
    id: number
    status: string
    current_phase: number
    created_at: string
    last_activity?: string
    interaction_count?: number
  }>
  has_active_session: boolean
  has_chat?: boolean
  latest_session?: {
    id: number
    status: string
    current_phase: number
    created_at: string
    last_activity?: string
    interaction_count?: number
  }
}