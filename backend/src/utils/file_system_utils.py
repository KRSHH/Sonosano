import os
import json

def is_audio_file(path, ext):
    """Checks if a file is an audio file based on its extension."""
    audio_extensions = {'.mp3', '.wav', '.flac', '.m4a', '.aac', '.ogg', '.wma', '.opus'}
    return ext in audio_extensions or any(path.lower().endswith(audio_ext) for audio_ext in audio_extensions)

def load_or_create_misc_config():
    """Loads or creates the misc config file."""
    config_path = os.path.join(os.path.dirname(__file__), '..', 'config', 'misc.json')
    if not os.path.exists(config_path):
        os.makedirs(os.path.dirname(config_path), exist_ok=True)
        with open(config_path, 'w') as f:
            json.dump({'credentials': {'username': '', 'password': ''}}, f, indent=4)
    with open(config_path, 'r') as f:
        return json.load(f)