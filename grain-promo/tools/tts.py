# Озвучка для ролика Grain: синтез русской речи голосом Piper (ru-irinia-medium).
# Использование: python3 tts.py <модель.onnx> <текст> <выход.wav>
import sys, wave
from piper import PiperVoice

model, text, out = sys.argv[1], sys.argv[2], sys.argv[3]
voice = PiperVoice.load(model)
with wave.open(out, "wb") as wf:
    voice.synthesize_wav(text, wf)
print("ok", out)
