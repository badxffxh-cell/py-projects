"""Approved narration script (gancho 1). Audio tags in [brackets] are for TTS only."""
import re

TTS_TEXT = (
    "[curious] E se a luz e a internet sumissem agora? Cinco minutos. Semáforos apagam. "
    "Cartão e caixa eletrônico costumam parar. Hospitais ligam geradores em segundos. "
    "Uma hora. A rede pode travar. No apagão da Espanha, a internet caiu a 17% do normal. "
    "Seis horas. As baterias das torres costumam durar de 2 a 8 horas. Quando acabam… o sinal some. "
    "Doze horas. A comida da geladeira já passou do limite. Sem bombas, a água pode parar de chegar. "
    "Vinte e quatro horas? [serious] No Amapá, a luz só voltou por completo depois de 22 dias. "
    "[warmly] Você aguentaria 24 horas? Comenta e salva."
)

CAPTION_TEXT = re.sub(r"\[[^\]]+\]\s*", "", TTS_TEXT).strip()
TOKENS = CAPTION_TEXT.split()


def norm(s: str) -> str:
    s = s.lower()
    return re.sub(r"[^\wà-ú%]", "", s)
