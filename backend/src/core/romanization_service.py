try:
    import uroman as ur
    UROMAN_AVAILABLE = True
except ImportError:
    UROMAN_AVAILABLE = False
    import logging
    logging.warning("uroman module not found. Romanization will be disabled.")

class RomanizationService:
    def __init__(self):
        self.uroman = ur.Uroman() if UROMAN_AVAILABLE else None

    def romanize(self, text: str) -> str:
        if not text or not UROMAN_AVAILABLE:
            return text  # Return original text if uroman is not available
        try:
            return self.uroman.romanize_string(text)
        except Exception as e:
            import logging
            logging.error(f"Error in romanization: {e}")
            return text  # Return original text on error
