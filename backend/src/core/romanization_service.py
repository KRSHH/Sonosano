import uroman as ur

class RomanizationService:
    def __init__(self):
        self.uroman = ur.Uroman()

    def romanize(self, text: str) -> str:
        if not text:
            return ""
        return self.uroman.romanize_string(text)
