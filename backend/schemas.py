from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime
from models import UserRole, LLMProvider, InvitationStatus

class GameCreate(BaseModel):
    title: str
    description: Optional[str] = None
    cover_image_url: Optional[str] = None

class GameResponse(BaseModel):
    id: int
    title: str
    description: Optional[str]
    cover_image_url: Optional[str]
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime]
    
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

class UserLogin(BaseModel):
    username: str
    password: str

class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str
    role: Optional[UserRole] = UserRole.PLAYER

class UserUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[EmailStr] = None
    password: Optional[str] = None
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None

class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    role: UserRole
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

class RoomCreate(BaseModel):
    name: str
    description: Optional[str] = None
    max_players: int = 4

class RoomResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    max_players: int
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

class GameSessionCreate(BaseModel):
    game_id: Optional[int] = None
    scenario_id: Optional[int] = None
    room_id: Optional[int] = None
    llm_provider: Optional[str] = None
    llm_model: Optional[str] = None

class GameSessionResponse(BaseModel):
    id: int
    game_id: int
    player_id: int
    room_id: Optional[int]
    current_scenario_id: Optional[int]
    current_phase: int
    status: str
    llm_provider: Optional[str]
    llm_model: Optional[str]
    created_at: datetime
    last_activity: datetime
    
    class Config:
        from_attributes = True

class InteractionCreate(BaseModel):
    session_id: int
    player_input: str
    player_input_type: str = "text"
    include_audio_response: bool = False

class InteractionResponse(BaseModel):
    id: int
    session_id: int
    player_input: str
    player_input_type: str
    ai_response: str
    ai_response_audio_url: Optional[str]
    llm_provider: Optional[str]
    llm_model: Optional[str]
    tokens_used: Optional[int]
    cost: Optional[float]
    response_time: Optional[float]
    created_at: datetime
    
    class Config:
        from_attributes = True

class ScenarioCreate(BaseModel):
    game_id: int
    name: str
    description: Optional[str] = None
    image_url: Optional[str] = None
    video_url: Optional[str] = None
    file_url: Optional[str] = None
    file_content: Optional[str] = None
    phase: int = 1
    order: int = 0

class ScenarioResponse(BaseModel):
    id: int
    game_id: int
    name: str
    description: Optional[str]
    image_url: Optional[str]
    video_url: Optional[str]
    file_url: Optional[str]
    file_content: Optional[str]
    phase: int
    order: int
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

class GameRuleCreate(BaseModel):
    game_id: int
    title: str
    description: Optional[str] = None
    rule_type: str
    content: Dict[str, Any]

class GameRuleResponse(BaseModel):
    id: int
    game_id: int
    title: str
    description: Optional[str]
    rule_type: str
    content: Dict[str, Any]
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

class LLMConfigCreate(BaseModel):
    game_id: int
    provider: LLMProvider
    model_name: str
    api_key: str
    cost_per_token: Optional[float] = None
    max_tokens: Optional[int] = None
    temperature: float = 0.7

class LLMConfigUpdate(BaseModel):
    provider: Optional[LLMProvider] = None
    model_name: Optional[str] = None
    api_key: Optional[str] = None
    cost_per_token: Optional[float] = None
    max_tokens: Optional[int] = None
    temperature: Optional[float] = None

class LLMConfigResponse(BaseModel):
    id: int
    game_id: int
    provider: LLMProvider
    model_name: str
    is_active: bool
    cost_per_token: Optional[float]
    max_tokens: Optional[int]
    temperature: float
    total_requests: int
    total_tokens: int
    total_cost: float
    avg_response_time: float
    created_at: datetime
    
    class Config:
        from_attributes = True

class LLMTestRequest(BaseModel):
    llm_config_id: int
    test_prompt: str

class LLMTestResponse(BaseModel):
    id: int
    llm_config_id: int
    response: str
    response_time: float
    tokens_used: Optional[int]
    cost: Optional[float]
    quality_score: Optional[float]
    created_at: datetime
    
    class Config:
        from_attributes = True

class SessionStats(BaseModel):
    session_id: int
    total_interactions: int
    total_tokens: int
    total_cost: float
    avg_response_time: float
    duration_minutes: float

class LLMStats(BaseModel):
    llm_config_id: int
    provider: str
    model_name: str
    total_requests: int
    total_tokens: int
    total_cost: float
    avg_response_time: float
    success_rate: float

# Schemas para sistema de convites e facilitadores
class InvitationCreate(BaseModel):
    email: EmailStr
    role: UserRole  # facilitator ou player
    game_ids: Optional[List[int]] = None  # Para jogadores: quais jogos terão acesso

class InvitationResponse(BaseModel):
    id: int
    email: str
    role: UserRole
    inviter_id: int
    token: str
    status: InvitationStatus
    expires_at: Optional[datetime]
    accepted_at: Optional[datetime]
    created_at: datetime
    
    class Config:
        from_attributes = True

class RegisterWithInvitation(BaseModel):
    username: str
    password: str
    token: str  # token do convite

class PlayerInviteCreate(BaseModel):
    email: EmailStr
    game_ids: List[int]  # jogos que o jogador terá acesso

class PlayerInviteResponse(BaseModel):
    id: int
    email: str
    facilitator_id: int
    game_ids: List[int]
    status: str
    created_at: datetime
    
    class Config:
        from_attributes = True

class FacilitatorPlayerResponse(BaseModel):
    id: int
    player_id: int
    player_username: str
    player_email: str
    created_at: datetime
    
    class Config:
        from_attributes = True

class PlayerGameAccessResponse(BaseModel):
    id: int
    player_id: int
    game_id: int
    game_title: str
    granted_by: int
    created_at: datetime
    
    class Config:
        from_attributes = True
