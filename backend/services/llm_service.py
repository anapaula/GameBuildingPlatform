from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
import time
import openai
from anthropic import Anthropic
from models import LLMConfiguration, LLMProvider

class LLMService:
    def __init__(self, db: Session):
        self.db = db
    
    def get_llm_config(self, config_id: Optional[int] = None, session_llm_provider: Optional[str] = None, session_llm_model: Optional[str] = None) -> Optional[LLMConfiguration]:
        if config_id:
            # Quando config_id é fornecido, buscar diretamente por ID (não precisa estar ativa)
            return self.db.query(LLMConfiguration).filter(LLMConfiguration.id == config_id).first()
        elif session_llm_provider and session_llm_model:
            # Tentar encontrar a LLM específica da sessão
            try:
                # Converter string para enum se necessário
                provider_enum = LLMProvider(session_llm_provider) if isinstance(session_llm_provider, str) else session_llm_provider
                config = self.db.query(LLMConfiguration).filter(
                    LLMConfiguration.provider == provider_enum,
                    LLMConfiguration.model_name == session_llm_model
                ).first()
                if config:
                    return config
            except (ValueError, AttributeError):
                # Se não conseguir converter, tenta buscar por string
                pass
        # Fallback para LLM ativa
        return self.db.query(LLMConfiguration).filter(LLMConfiguration.is_active == True).first()
    
    async def generate_response(self, prompt: str, system_prompt: Optional[str] = None, config_id: Optional[int] = None, context: Optional[Dict[str, Any]] = None, session_llm_provider: Optional[str] = None, session_llm_model: Optional[str] = None) -> Dict[str, Any]:
        config = self.get_llm_config(config_id, session_llm_provider, session_llm_model)
        if not config:
            raise ValueError("Nenhuma configuração de LLM ativa encontrada")
        start_time = time.time()
        try:
            if config.provider == LLMProvider.OPENAI:
                response = await self._call_openai(prompt, system_prompt, config, context)
            elif config.provider == LLMProvider.ANTHROPIC:
                response = await self._call_anthropic(prompt, system_prompt, config, context)
            else:
                raise ValueError(f"Provider {config.provider} não suportado")
            response_time = time.time() - start_time
            tokens_used = response.get("tokens_used", 0)
            cost = tokens_used * config.cost_per_token if config.cost_per_token else 0
            config.total_requests += 1
            config.total_tokens += tokens_used
            config.total_cost += cost
            if config.avg_response_time == 0:
                config.avg_response_time = response_time
            else:
                config.avg_response_time = (config.avg_response_time * 0.9) + (response_time * 0.1)
            self.db.commit()
            return {"response": response["text"], "tokens_used": tokens_used, "cost": cost, "response_time": response_time, "provider": config.provider.value, "model": config.model_name}
        except Exception as e:
            raise Exception(f"Erro ao gerar resposta: {str(e)}")
    
    async def _call_openai(self, prompt: str, system_prompt: Optional[str], config: LLMConfiguration, context: Optional[Dict[str, Any]]) -> Dict[str, Any]:
        try:
            client = openai.OpenAI(api_key=config.api_key)
            messages = []
            if system_prompt:
                messages.append({"role": "system", "content": system_prompt})
            if context:
                messages.append({"role": "system", "content": f"Contexto: {context}"})
            messages.append({"role": "user", "content": prompt})
            
            # Preparar parâmetros
            params = {
                "model": config.model_name,
                "messages": messages,
                "temperature": config.temperature or 0.7
            }
            if config.max_tokens:
                params["max_tokens"] = config.max_tokens
            
            response = client.chat.completions.create(**params)
            return {"text": response.choices[0].message.content, "tokens_used": response.usage.total_tokens}
        except Exception as e:
            raise Exception(f"Erro ao chamar OpenAI: {str(e)}")
    
    async def _call_anthropic(self, prompt: str, system_prompt: Optional[str], config: LLMConfiguration, context: Optional[Dict[str, Any]]) -> Dict[str, Any]:
        client = Anthropic(api_key=config.api_key)
        system_message = system_prompt or ""
        if context:
            system_message += f"\n\nContexto: {context}"
        response = client.messages.create(model=config.model_name, max_tokens=config.max_tokens or 1024, temperature=config.temperature, system=system_message, messages=[{"role": "user", "content": prompt}])
        return {"text": response.content[0].text, "tokens_used": response.usage.input_tokens + response.usage.output_tokens}
    
    def build_game_context(self, session_id: int, current_scenario: Optional[Any] = None, game_rules: Optional[list] = None) -> Dict[str, Any]:
        context = {"language": "pt-BR", "session_id": session_id}
        if current_scenario:
            context["scenario"] = {"name": current_scenario.name, "description": current_scenario.description, "phase": current_scenario.phase}
        if game_rules:
            context["rules"] = [rule.content for rule in game_rules]
        return context
