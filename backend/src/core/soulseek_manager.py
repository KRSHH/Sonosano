import os
import sys
import time
import threading
from collections import defaultdict
from typing import List, Dict, Any, Optional
import logging

from pynicotine.config import config
from pynicotine.core import core
from pynicotine.events import events
from pynicotine.transfers import TransferStatus
from pynicotine.slskmessages import FileListMessage

from utils.file_system_utils import is_audio_file
from .library_service import LibraryService

class SoulseekManager:
    def __init__(self, library_service: LibraryService, data_path: str):
        self.library_service = library_service
        self.data_path = data_path
        self.logged_in = False
        self.login_event = threading.Event()
        self.search_results = defaultdict(list)
        self.download_status = {}
        self.search_tokens = {}
        self.active_downloads = {}

    def on_login(self, msg):
        if msg.success:
            self.logged_in = True
            username = config.sections['server']['login']
            logging.info(f"Successfully logged in as {username}")
            self.login_event.set()
        else:
            self.logged_in = False
            logging.error(f"Login failed: {msg.reason if hasattr(msg, 'reason') else 'Unknown reason'}")

    def on_disconnect(self, msg):
        self.logged_in = False
        logging.info("Disconnected from Soulseek")

    def on_search_result(self, msg):
        token = msg.token
        username = msg.username
        results = msg.list if hasattr(msg, 'list') else []
        
        for result in results:
            if len(result) >= 4:
                code, path, size, ext = result[:4]
                attrs = result[4] if len(result) > 4 else None
                
                quality_str = ""
                bitrate = None
                length_str = ""
                if attrs:
                    h_quality, bitrate_val, h_length, length = FileListMessage.parse_audio_quality_length(size, attrs)
                    quality_str = h_quality
                    bitrate = bitrate_val if bitrate_val > 0 else None
                    length_str = h_length
                
                if is_audio_file(path, ext):
                    extracted_ext = ext
                    if not ext:
                        for audio_ext in {'.mp3', '.wav', '.flac', '.m4a', '.aac', '.ogg', '.wma', '.opus'}:
                            if path.lower().endswith(audio_ext):
                                extracted_ext = audio_ext
                                break
                    
                    file_info = {
                        'path': path,
                        'size': size,
                        'extension': extracted_ext,
                        'username': username,
                        'bitrate': bitrate,
                        'quality': quality_str if quality_str else None,
                        'length': length_str if length_str else None
                    }
                    self.search_results[token].append(file_info)

    def on_download_update(self, transfer, update_parent=True):
        file_path = transfer.virtual_path
        username = transfer.username
        status = transfer.status
        progress = transfer.current_byte_offset or 0
        total = transfer.size or 1
        percent = (progress / total) * 100 if total > 0 else 0
        speed = getattr(transfer, 'speed', 0) or 0
        queue_position = getattr(transfer, 'queue_position', None)
        
        key = f"{username}:{file_path}"
        
        status_obj = {
            'status': status,
            'progress': progress,
            'total': total,
            'percent': percent,
            'speed': speed,
            'queuePosition': queue_position
        }
        
        if status in [TransferStatus.CONNECTION_CLOSED, TransferStatus.CONNECTION_TIMEOUT, 
                      TransferStatus.USER_LOGGED_OFF, TransferStatus.LOCAL_FILE_ERROR,
                      TransferStatus.DOWNLOAD_FOLDER_ERROR]:
            status_obj['errorMessage'] = f"Download failed: {status}"
        elif status == TransferStatus.FILTERED:
            status_obj['errorMessage'] = "File was filtered based on your download filters settings"
        elif status == TransferStatus.PAUSED:
            status_obj['errorMessage'] = "Download has been paused"
        elif status == TransferStatus.CANCELLED:
            status_obj['errorMessage'] = "Download was cancelled"
        
        self.download_status[key] = status_obj
        
        if status == TransferStatus.FINISHED:
            filename = os.path.basename(file_path)
            if key in self.library_service.download_metadata or key in self.active_downloads:
                metadata = self.library_service.download_metadata.get(key) or (self.active_downloads.get(key, {}).get('metadata'))
                if metadata:
                    self.library_service.download_metadata[key] = metadata
                    self.library_service.download_metadata[filename] = metadata
            
            def delayed_rescan():
                time.sleep(1)
                try:
                    core.shares.rescan_shares()
                except Exception as e:
                    logging.error(f"Error during automatic share rescan: {e}")
            
            rescan_thread = threading.Thread(target=delayed_rescan, daemon=True)
            rescan_thread.start()

    def initialize_soulseek(self):
        core.init_components(enabled_components={
            "error_handler", "network_thread", "shares", "users", "notifications",
            "network_filter", "statistics", "search", "downloads", "uploads",
            "interests", "userbrowse", "userinfo", "buddies", "chatrooms",
            "privatechat", "pluginhandler", "cli"
        })
        
        events.connect("server-login", self.on_login)
        events.connect("server-disconnect", self.on_disconnect)
        events.connect("file-search-response", self.on_search_result)
        events.connect("update-download", self.on_download_update)
        
        self.setup_soulseek_config()
        
        core.start()
        core.connect()

    def setup_soulseek_config(self):
        # The username and password are now set in main.py
        # and loaded into the config object before this method is called.
        config.sections["server"]["server"] = ("server.slsknet.org", 2242)
        config.sections["server"]["auto_connect_startup"] = True
        config.sections["server"]["portrange"] = (2234, 2240)
        config.sections["server"]["upnp"] = True
        config.sections["server"]["upnp_interval"] = 4
        config.sections["server"]["interface"] = ""
        config.sections["server"]["obfuscated"] = False
        config.sections["server"]["login_timeout"] = 60
        config.sections["server"]["timeout"] = 30
        
        download_dir = os.path.join(self.data_path, "downloads")
        if not os.path.exists(download_dir):
            os.makedirs(download_dir)
        config.sections["transfers"]["downloaddir"] = download_dir
        
        config.sections["transfers"]["rescanonstartup"] = True
        config.sections["transfers"]["rescan_shares_daily"] = True
        config.sections["transfers"]["shared"] = [("Downloads", download_dir)]
        config.sections["transfers"]["uploadallowed"] = 3
        config.sections["transfers"]["useupslots"] = True
        config.sections["transfers"]["uploadslots"] = 3
        config.sections["transfers"]["uploadbandwidth"] = 0
        config.sections["transfers"]["friendsnolimits"] = True
        config.sections["transfers"]["enablebuddyshares"] = True
        config.sections["transfers"]["enabletrustedshares"] = True
        config.sections["transfers"]["enablefilters"] = False
        
        # Save the configuration to persist the credentials
        config.write_configuration()

    def wait_for_login(self, timeout=30):
        start_time = time.time()
        
        while time.time() - start_time < timeout:
            if self.logged_in:
                return True
            
            if not events.process_thread_events():
                break
            time.sleep(0.1)
                
        return False

    def process_events(self):
        while True:
            events.process_thread_events()
            time.sleep(0.1)

    def perform_search_with_fallback(self, artist: Optional[str], song: Optional[str], raw_query: str) -> tuple[int, str]:
        self.search_results.clear()
        
        if artist and song:
            search_term = f"{artist} {song}"
            core.search.do_search(search_term, "global")
            
            tokens = list(core.search.searches.keys())
            if tokens:
                token = tokens[-1]
                
                time.sleep(3)
                events.process_thread_events()
                
                if self.search_results.get(token, []):
                    return token, search_term
        
        core.search.do_search(raw_query, "global")
        
        tokens = list(core.search.searches.keys())
        if tokens:
            token = tokens[-1]
            return token, raw_query
        
        return None, raw_query

    def calculate_time_remaining(self, progress: int, total: int, speed: float) -> Optional[float]:
        """Calculates the estimated time remaining for a download."""
        if speed > 0:
            remaining_bytes = total - progress
            return remaining_bytes / speed
        return None
