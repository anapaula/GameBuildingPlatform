from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey, JSON, Float, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base
import enum

class UserRole(str, enum.Enum):
    ADMIN = "admin"
    PLAYER = "player"

class LLMProvider(str, enum.Enum):
    OPENAI = "openai"
    ANTHROPIC = "anthropic"

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(SQLEnum(UserRole), default=UserRole.PLAYER)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    sessions = relationship("GameSession", back_populates="player")
    room_memberships = relationship("RoomMember", back_populates="user")

class Room(Base):
    __tablename__ = "rooms"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(Text)
    max_players = Column(Integer, default=4)
    is_active = Column(Boolean, default=True)
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    members = relationship("RoomMember", back_populates="room")
    sessions = relationship("GameSession", back_populates="room")

class RoomMember(Base):
    __tablename__ = "room_members"
    
    id = Column(Integer, primary_key=True, index=True)
    room_id = Column(Integer, ForeignKey("rooms.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    joined_at = Column(DateTime(timezone=True), server_default=func.now())
    
    room = relationship("Room", back_populates="members")
    user = relationship("User", back_populates="room_memberships")

class Scenario(Base):
    __tablename__ = "scenarios"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(Text)
    image_url = Column(String)
    phase = Column(Integer, default=1)
    order = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    session_scenarios = relationship("SessionScenario", back_populates="scenario")

class GameSession(Base):
    __tablename__ = "game_sessions"
    
    id = Column(Integer, primary_key=True, index=True)
    player_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    room_id = Column(Integer, ForeignKey("rooms.id"))
    current_scenario_id = Column(Integer, ForeignKey("scenarios.id"))
    current_phase = Column(Integer, default=1)
    status = Column(String, default="active")
    llm_provider = Column(String)
    llm_model = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    last_activity = Column(DateTime(timezone=True), server_default=func.now())
    
    player = relationship("User", back_populates="sessions")
    room = relationship("Room", back_populates="sessions")
    interactions = relationship("SessionInteraction", back_populates="session")
    scenarios = relationship("SessionScenario", back_populates="session")

class SessionInteraction(Base):
    __tablename__ = "session_interactions"
    
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("game_sessions.id"), nullable=False)
    player_input = Column(Text, nullable=False)
    player_input_type = Column(String)
    ai_response = Column(Text, nullable=False)
    ai_response_audio_url = Column(String)
    llm_provider = Column(String)
    llm_model = Column(String)
    tokens_used = Column(Integer)
    cost = Column(Float)
    response_time = Column(Float)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    session = relationship("GameSession", back_populates="interactions")

class SessionScenario(Base):
    __tablename__ = "session_scenarios"
    
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("game_sessions.id"), nullable=False)
    scenario_id = Column(Integer, ForeignKey("scenarios.id"), nullable=False)
    phase = Column(Integer, default=1)
    completed = Column(Boolean, default=False)
    completed_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    session = relationship("GameSession", back_populates="scenarios")
    scenario = relationship("Scenario", back_populates="session_scenarios")

class GameRule(Base):
    __tablename__ = "game_rules"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text)
    rule_type = Column(String)
    content = Column(JSON)
    is_active = Column(Boolean, default=True)
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class LLMConfiguration(Base):
    __tablename__ = "llm_configurations"
    
    id = Column(Integer, primary_key=True, index=True)
    provider = Column(SQLEnum(LLMProvider), nullable=False)
    model_name = Column(String, nullable=False)
    api_key = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    cost_per_token = Column(Float)
    max_tokens = Column(Integer)
    temperature = Column(Float, default=0.7)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    total_requests = Column(Integer, default=0)
    total_tokens = Column(Integer, default=0)
    total_cost = Column(Float, default=0.0)
    avg_response_time = Column(Float, default=0.0)

class LLMTestResult(Base):
    __tablename__ = "llm_test_results"
    
    id = Column(Integer, primary_key=True, index=True)
    llm_config_id = Column(Integer, ForeignKey("llm_configurations.id"), nullable=False)
    test_prompt = Column(Text, nullable=False)
    response = Column(Text, nullable=False)
    response_time = Column(Float, nullable=False)
    tokens_used = Column(Integer)
    cost = Column(Float)
    quality_score = Column(Float)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

