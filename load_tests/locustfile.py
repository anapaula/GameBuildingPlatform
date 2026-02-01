import os
import uuid
import random
from locust import HttpUser, task, between


class GameLoadUser(HttpUser):
    wait_time = between(2, 5)
    host = os.getenv("LOCUST_HOST", "http://localhost:8000")

    def on_start(self):
        self.username = f"load_{uuid.uuid4().hex[:8]}"
        self.password = "LoadTest@123"
        self.email = f"{self.username}@example.com"
        self.headers = {}
        self.ready = False
        self.session_ids = []
        self.game_id = None

        register_payload = {
            "username": self.username,
            "email": self.email,
            "password": self.password,
            "role": "PLAYER",
        }
        # Registro
        self.client.post("/api/auth/register", json=register_payload, name="/api/auth/register", catch_response=True)

        # Login
        login_response = self.client.post(
            "/api/auth/login",
            data={"username": self.username, "password": self.password},
            name="/api/auth/login",
        )
        if login_response.status_code != 200:
            return
        token = login_response.json().get("access_token")
        if not token:
            return
        self.headers = {"Authorization": f"Bearer {token}"}

        # Obter jogos
        games_response = self.client.get("/api/player/games", headers=self.headers, name="/api/player/games")
        if games_response.status_code != 200:
            return
        games = games_response.json() or []
        if not games:
            return
        # Selecionar o primeiro jogo com cenários ativos
        for game in games:
            game_id = game.get("id")
            if not game_id:
                continue
            scenarios_response = self.client.get(
                "/api/game/config/scenarios",
                params={"game_id": game_id},
                headers=self.headers,
                name="/api/game/config/scenarios",
            )
            if scenarios_response.status_code != 200:
                continue
            scenarios = scenarios_response.json() or []
            if scenarios:
                self.game_id = game_id
                break
        if not self.game_id:
            return

        # Criar 2 salas por usuário e iniciar sessão
        for idx in range(2):
            room_payload = {
                "name": f"{self.username}-room-{idx + 1}",
                "description": "Sala de teste de carga",
                "max_players": 4,
                "game_id": self.game_id,
            }
            room_response = self.client.post("/api/rooms/", json=room_payload, headers=self.headers, name="/api/rooms/")
            if room_response.status_code != 201:
                continue
            room_id = room_response.json().get("id")
            if not room_id:
                continue
            session_payload = {"game_id": self.game_id, "room_id": room_id}
            session_response = self.client.post(
                "/api/sessions/",
                json=session_payload,
                headers=self.headers,
                name="/api/sessions/",
            )
            if session_response.status_code == 201:
                session_id = session_response.json().get("id")
                if session_id:
                    self.session_ids.append(session_id)

        self.ready = True

    @task
    def interact_and_save_status(self):
        if not self.ready or not self.session_ids:
            return
        session_id = random.choice(self.session_ids)
        payload = {
            "session_id": session_id,
            "player_input": "rolar dados",
            "player_input_type": "text",
            "include_audio_response": False,
        }
        with self.client.post(
            "/api/game/interact",
            json=payload,
            headers=self.headers,
            name="/api/game/interact",
            catch_response=True,
        ) as response:
            if response.status_code != 200:
                detail = ""
                try:
                    detail = response.json().get("detail", "")
                except Exception:
                    detail = response.text
                response.failure(f"{response.status_code}: {detail}")
