from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime
from models import UserRole, LLMProvider

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
    scenario_id: Optional[int] = None
    room_id: Optional[int] = None
    llm_provider: Optional[str] = None
    llm_model: Optional[str] = None

class GameSessionResponse(BaseModel):
    id: int
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
    name: str
    description: Optional[str] = None
    image_url: Optional[str] = None
    file_url: Optional[str] = None
    file_content: Optional[str] = None
    phase: int = 1
    order: int = 0

class ScenarioResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    image_url: Optional[str]
    file_url: Optional[str]
    file_content: Optional[str]
    phase: int
    order: int
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

class GameRuleCreate(BaseModel):
    title: str
    description: Optional[str] = None
    rule_type: str
    content: Dict[str, Any]

class GameRuleResponse(BaseModel):
    id: int
    title: str
    description: Optional[str]
    rule_type: str
    content: Dict[str, Any]
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

class LLMConfigCreate(BaseModel):
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

