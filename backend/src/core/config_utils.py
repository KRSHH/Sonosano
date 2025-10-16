import os
import sys

def get_documents_folder():
    """Get the user's documents folder path."""
    if sys.platform == "win32":
        import ctypes
        from ctypes.wintypes import MAX_PATH
        dll = ctypes.windll.shell32
        buf = ctypes.create_unicode_buffer(MAX_PATH + 1)
        if dll.SHGetSpecialFolderPathW(None, buf, 0x0005, False):
            return buf.value
        else:
            return os.path.join(os.path.expanduser("~"), "Documents")
    else:
        return os.path.expanduser("~/Documents")

def get_config_path():
    """Get the path to the config file in Documents/sonosano_config/pref.ini."""
    documents_folder = get_documents_folder()
    config_dir = os.path.join(documents_folder, "sonosano_config")
    os.makedirs(config_dir, exist_ok=True)
    return os.path.join(config_dir, "pref.ini")