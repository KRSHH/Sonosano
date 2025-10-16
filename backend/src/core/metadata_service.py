import os
import base64
import time
import logging
from typing import Dict, Any, Optional

try:
    from mutagen import File as MutagenFile
    MUTAGEN_AVAILABLE = True
except ImportError:
    MUTAGEN_AVAILABLE = False

class MetadataService:
    def __init__(self, data_path: str):
        self.data_path = data_path
        self.covers_path = os.path.join(self.data_path, 'covers')
        os.makedirs(self.covers_path, exist_ok=True)

    def extract_metadata_from_file(self, file_path: str) -> Dict[str, Any]:
        """Extract metadata from audio file using mutagen."""
        metadata = {}
        
        if not MUTAGEN_AVAILABLE:
            return metadata
        
        # Retry logic for file access
        for i in range(3):
            try:
                audio_file = MutagenFile(file_path)
                if audio_file is None:
                    return metadata
                break
            except Exception as e:
                if i == 2:
                    logging.error(f"Error extracting metadata from {file_path}: {str(e)[:200]}")
                    return metadata
                time.sleep(0.5)
        else:
            return metadata
        
        try:
            
            if hasattr(audio_file, 'tags') and audio_file.tags:
                tags = audio_file.tags
                
                if hasattr(tags, 'as_dict'):
                    tag_dict = tags.as_dict()
                    
                    for key in ['title', 'TITLE', 'Title']:
                        if key in tag_dict:
                            metadata['title'] = str(tag_dict[key][0] if isinstance(tag_dict[key], list) else tag_dict[key])
                            break
                    
                    for key in ['artist', 'ARTIST', 'Artist', 'albumartist', 'ALBUMARTIST']:
                        if key in tag_dict:
                            metadata['artist'] = str(tag_dict[key][0] if isinstance(tag_dict[key], list) else tag_dict[key])
                            break
                    
                    for key in ['album', 'ALBUM', 'Album']:
                        if key in tag_dict:
                            metadata['album'] = str(tag_dict[key][0] if isinstance(tag_dict[key], list) else tag_dict[key])
                            break
                    
                    for key in ['date', 'DATE', 'Date', 'year', 'YEAR']:
                        if key in tag_dict:
                            year_str = str(tag_dict[key][0] if isinstance(tag_dict[key], list) else tag_dict[key])
                            if len(year_str) >= 4:
                                metadata['year'] = year_str[:4]
                            break
                    
                    for key in ['genre', 'GENRE', 'Genre']:
                        if key in tag_dict:
                            metadata['genre'] = str(tag_dict[key][0] if isinstance(tag_dict[key], list) else tag_dict[key])
                            break
                else:
                    for key in ['TIT2', 'TITLE', '\xa9nam']:
                        if key in tags:
                            metadata['title'] = str(tags[key][0] if isinstance(tags[key], list) else tags[key])
                            break
                    
                    for key in ['TPE1', 'ARTIST', '\xa9ART']:
                        if key in tags:
                            metadata['artist'] = str(tags[key][0] if isinstance(tags[key], list) else tags[key])
                            break
                
                for key in ['TALB', 'ALBUM', '\xa9alb']:
                    if key in tags:
                        metadata['album'] = str(tags[key][0] if isinstance(tags[key], list) else tags[key])
                        break
                
                for key in ['TDRC', 'DATE', 'YEAR', '\xa9day']:
                    if key in tags:
                        year_str = str(tags[key][0] if isinstance(tags[key], list) else tags[key])
                        metadata['year'] = year_str[:4] if len(year_str) >= 4 else year_str
                        break
                
                for key in ['TCON', 'GENRE', '\xa9gen']:
                    if key in tags:
                        metadata['genre'] = str(tags[key][0] if isinstance(tags[key], list) else tags[key])
                        break
                
                cover_data = None
                mime_type = None
                
                if 'APIC:' in tags or 'APIC' in tags:
                    for key in tags.keys():
                        if key.startswith('APIC'):
                            apic = tags[key]
                            if hasattr(apic, 'data'):
                                cover_data = apic.data
                                mime_type = apic.mime if hasattr(apic, 'mime') else 'image/jpeg'
                                break
                
                elif hasattr(audio_file, 'pictures') and audio_file.pictures:
                    pic = audio_file.pictures[0]
                    cover_data = pic.data
                    mime_type = pic.mime if hasattr(pic, 'mime') else 'image/jpeg'
                
                if cover_data:
                    artist = metadata.get('artist', 'unknown')
                    album = metadata.get('album', 'unknown')
                    file_name = f"{artist}_{album}.jpg".replace('/', '_')
                    
                    cover_path = os.path.join(self.covers_path, file_name)
                    with open(cover_path, 'wb') as f:
                        f.write(cover_data)
                    
                    metadata['coverArt'] = file_name.replace('\\', '/')
            
            if hasattr(audio_file.info, 'length'):
                metadata['duration'] = int(audio_file.info.length * 1000)

            if hasattr(audio_file.info, 'bitrate'):
                metadata['bitrate'] = audio_file.info.bitrate

            if hasattr(audio_file.info, 'sample_rate'):
                metadata['sampleRate'] = audio_file.info.sample_rate

            if hasattr(audio_file.info, 'bits_per_sample'):
                metadata['bitsPerSample'] = audio_file.info.bits_per_sample

            # Create display quality string
            ext = os.path.splitext(file_path)[1].lower()
            if ext in ['.flac', '.wav'] and metadata.get('sampleRate') and metadata.get('bitsPerSample'):
                khz = metadata['sampleRate'] / 1000
                khz_str = f"{khz:.1f}".rstrip('0').rstrip('.')
                metadata['display_quality'] = f"{khz_str}kHz / {metadata['bitsPerSample']} bit"
            elif metadata.get('bitrate'):
                kbps = round(metadata['bitrate'] / 1000)
                if kbps > 0:
                    metadata['display_quality'] = f"{kbps}kbps"

        except Exception as e:
            logging.error(f"Error processing metadata for {file_path}: {str(e)[:200]}")
        
        return metadata

    def extract_metadata_from_filename(self, filename: str) -> Dict[str, Any]:
        """Extract metadata from filename as fallback."""
        metadata = {}
        
        name_without_ext = os.path.splitext(filename)[0]
        
        import re
        cleaned_name = re.sub(r'^\d+\s*[-.]\s*', '', name_without_ext)
        
        parts = cleaned_name.split(' - ')
        if len(parts) >= 2:
            metadata['artist'] = parts[0].strip()
            metadata['title'] = ' - '.join(parts[1:]).strip()
        else:
            metadata['title'] = cleaned_name
        
        return metadata

    def merge_metadata(self, file_metadata: Dict[str, Any], 
                       search_metadata: Optional[Dict[str, Any]], 
                       filename: str) -> Dict[str, Any]:
        """Merge metadata with proper fallback hierarchy."""
        final_metadata = {}
        filename_metadata = self.extract_metadata_from_filename(filename)
        
        soulseek_priority_fields = ['bitrate', 'length']
        
        regular_fields = ['title', 'artist', 'album', 'year', 'genre', 'duration', 'sampleRate', 'bitsPerSample', 'display_quality']
        
        for field in ['bitrate', 'length']:
            if search_metadata and search_metadata.get(field):
                final_metadata[field] = search_metadata[field]
            elif file_metadata.get(field):
                final_metadata[field] = file_metadata[field]
        
        for field in regular_fields:
            if file_metadata.get(field):
                final_metadata[field] = file_metadata[field]
            elif search_metadata and search_metadata.get(field):
                final_metadata[field] = search_metadata[field]
            elif field in ['title', 'artist'] and filename_metadata.get(field):
                final_metadata[field] = filename_metadata[field]
        
        if file_metadata.get('coverArt'):
            final_metadata['coverArt'] = file_metadata['coverArt']
        elif search_metadata and search_metadata.get('coverArt'):
            final_metadata['coverArt'] = search_metadata['coverArt']
        
        if not final_metadata.get('title'):
            final_metadata['title'] = os.path.splitext(filename)[0]
        
        return final_metadata