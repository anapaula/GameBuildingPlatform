from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey, JSON, Float, Enum as SQLEnum, Index, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base
import enum

class UserRole(str, enum.Enum):
    ADMIN = "ADMIN"
    FACILITATOR = "FACILITATOR"
    PLAYER = "PLAYER"

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
    # Relacionamentos para facilitadores
    facilitated_players = relationship("FacilitatorPlayer", foreign_keys="[FacilitatorPlayer.facilitator_id]", back_populates="facilitator")
    # Relacionamentos para jogadores
    facilitator_relation = relationship("FacilitatorPlayer", foreign_keys="[FacilitatorPlayer.player_id]", back_populates="player")
    game_accesses = relationship("PlayerGameAccess", foreign_keys="[PlayerGameAccess.player_id]", back_populates="player")
    facilitator_game_accesses = relationship("FacilitatorGameAccess", foreign_keys="[FacilitatorGameAccess.facilitator_id]", back_populates="facilitator")

class Room(Base):
    __tablename__ = "rooms"

    __table_args__ = (
        UniqueConstraint("game_id", "name", name="uq_rooms_game_id_name"),
        Index("ix_rooms_game_id", "game_id"),
    )
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(Text)
    max_players = Column(Integer, default=4)
    is_active = Column(Boolean, default=True)
    created_by = Column(Integer, ForeignKey("users.id"))
    game_id = Column(Integer, ForeignKey("games.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    members = relationship("RoomMember", back_populates="room")
    sessions = relationship("GameSession", back_populates="room")

class RoomMember(Base):
    __tablename__ = "room_members"

    __table_args__ = (
        UniqueConstraint("room_id", "user_id", name="uq_room_members_room_user"),
        Index("ix_room_members_room_id", "room_id"),
        Index("ix_room_members_user_id", "user_id"),
    )
    
    id = Column(Integer, primary_key=True, index=True)
    room_id = Column(Integer, ForeignKey("rooms.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    joined_at = Column(DateTime(timezone=True), server_default=func.now())
    
    room = relationship("Room", back_populates="members")
    user = relationship("User", back_populates="room_memberships")

class Game(Base):
    __tablename__ = "games"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text)
    cover_image_url = Column(String)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    scenarios = relationship("Scenario", back_populates="game", cascade="all, delete-orphan")
    rules = relationship("GameRule", back_populates="game", cascade="all, delete-orphan")
    llm_configs = relationship("LLMConfiguration", back_populates="game", cascade="all, delete-orphan")
    sessions = relationship("GameSession", back_populates="game", cascade="all, delete-orphan")

class Scenario(Base):
    __tablename__ = "scenarios"
    
    id = Column(Integer, primary_key=True, index=True)
    game_id = Column(Integer, ForeignKey("games.id"), nullable=False)
    name = Column(String, nullable=False)
    description = Column(Text)
    image_url = Column(String)
    video_url = Column(String)
    file_url = Column(String)  # URL do arquivo PDF, DOCX ou TXT
    file_content = Column(Text)  # Conteúdo extraído do arquivo
    phase = Column(Integer, default=1)
    order = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    game = relationship("Game", back_populates="scenarios")
    session_scenarios = relationship("SessionScenario", back_populates="scenario")

class GameSession(Base):
    __tablename__ = "game_sessions"

    __table_args__ = (
        Index("ix_game_sessions_player_room_game_status", "player_id", "room_id", "game_id", "status"),
        Index("ix_game_sessions_room_id", "room_id"),
    )
    
    id = Column(Integer, primary_key=True, index=True)
    game_id = Column(Integer, ForeignKey("games.id"), nullable=False)
    player_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    room_id = Column(Integer, ForeignKey("rooms.id"))
    current_scenario_id = Column(Integer, ForeignKey("scenarios.id"))
    current_phase = Column(Integer, default=1)
    current_scene_index = Column(Integer, default=0)
    status = Column(String, default="active")
    llm_provider = Column(String)
    llm_model = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    last_activity = Column(DateTime(timezone=True), server_default=func.now())
    
    game = relationship("Game", back_populates="sessions")
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

class PlayerBoard(Base):
    __tablename__ = "player_boards"

    __table_args__ = (
        UniqueConstraint("session_id", "player_id", name="uq_player_boards_session_player"),
        Index("ix_player_boards_session_id", "session_id"),
    )

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("game_sessions.id"), nullable=False)
    player_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    board_state = Column(JSON, default=dict)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    session = relationship("GameSession")
    player = relationship("User")

class GameRule(Base):
    __tablename__ = "game_rules"
    
    id = Column(Integer, primary_key=True, index=True)
    game_id = Column(Integer, ForeignKey("games.id"), nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text)
    rule_type = Column(String)
    content = Column(JSON)
    is_active = Column(Boolean, default=True)
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    game = relationship("Game", back_populates="rules")

class LLMConfiguration(Base):
    __tablename__ = "llm_configurations"
    
    id = Column(Integer, primary_key=True, index=True)
    game_id = Column(Integer, ForeignKey("games.id"), nullable=False)
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
    
    game = relationship("Game", back_populates="llm_configs")

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

class InvitationStatus(str, enum.Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    EXPIRED = "expired"

class Invitation(Base):
    __tablename__ = "invitations"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, nullable=False, index=True)
    role = Column(SQLEnum(UserRole), nullable=False)  # facilitator ou player
    inviter_id = Column(Integer, ForeignKey("users.id"), nullable=False)  # admin ou facilitador que convidou
    token = Column(String, unique=True, nullable=False, index=True)  # token único para o link de registro
    status = Column(SQLEnum(InvitationStatus), default=InvitationStatus.PENDING)
    expires_at = Column(DateTime(timezone=True))
    accepted_at = Column(DateTime(timezone=True))
    game_ids = Column(JSON)  # Lista de IDs de jogos (para jogadores)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    inviter = relationship("User", foreign_keys=[inviter_id])

class InvitationGame(Base):
    __tablename__ = "invitation_games"
    
    id = Column(Integer, primary_key=True, index=True)
    invitation_id = Column(Integer, ForeignKey("invitations.id"), nullable=False)
    game_id = Column(Integer, ForeignKey("games.id"), nullable=False)
    
    invitation = relationship("Invitation")
    game = relationship("Game")

class FacilitatorPlayer(Base):
    __tablename__ = "facilitator_players"
    
    id = Column(Integer, primary_key=True, index=True)
    facilitator_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    player_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    facilitator = relationship("User", foreign_keys=[facilitator_id], back_populates="facilitated_players")
    player = relationship("User", foreign_keys=[player_id], back_populates="facilitator_relation")

class PlayerGameAccess(Base):
    __tablename__ = "player_game_access"

    __table_args__ = (
        UniqueConstraint("player_id", "game_id", name="uq_player_game_access_player_game"),
        Index("ix_player_game_access_player_id", "player_id"),
    )
    
    id = Column(Integer, primary_key=True, index=True)
    player_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    game_id = Column(Integer, ForeignKey("games.id"), nullable=False)
    granted_by = Column(Integer, ForeignKey("users.id"), nullable=False)  # facilitador que concedeu acesso
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    player = relationship("User", foreign_keys=[player_id], back_populates="game_accesses")
    game = relationship("Game")

class FacilitatorGameAccess(Base):
    __tablename__ = "facilitator_game_access"

    __table_args__ = (
        UniqueConstraint("facilitator_id", "game_id", name="uq_facilitator_game_access_facilitator_game"),
        Index("ix_facilitator_game_access_facilitator_id", "facilitator_id"),
    )

    id = Column(Integer, primary_key=True, index=True)
    facilitator_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    game_id = Column(Integer, ForeignKey("games.id"), nullable=False)
    granted_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    facilitator = relationship("User", foreign_keys=[facilitator_id], back_populates="facilitator_game_accesses")
    game = relationship("Game")
