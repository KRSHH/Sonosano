import requests
import json
from bs4 import BeautifulSoup
import textwrap
import sys
from concurrent.futures import ThreadPoolExecutor

def format_duration(milliseconds):
    """Converts milliseconds to a MM:SS string format."""
    if not isinstance(milliseconds, (int, float)):
        return None
    seconds = int(milliseconds / 1000)
    mins = seconds // 60
    secs = seconds % 60
    return f"{mins:02}:{secs:02}"

def format_item(item):
    """Formats a single search result item into a dictionary."""
    title = item.get('title')
    if not title and item.get('titleLinks'):
        title = item.get('titleLinks', [{}])[0].get('title', 'N/A')
    
    item_type = item.get('contentDescriptor', {}).get('kind', item.get('itemKind', 'N/A')).replace('_', ' ').title()

    artist = item.get('subtitle', '')
    if not artist and item.get('subtitleLinks'):
        artist_list = [link.get('title', '') for link in item.get('subtitleLinks', [])]
        artist = ", ".join(artist_list)
    
    url = item.get('contentDescriptor', {}).get('url', 'N/A')
    
    artwork_url = 'N/A'
    artwork_obj = item.get('artwork')
    if artwork_obj and isinstance(artwork_obj, dict):
        artwork_data = artwork_obj.get('dictionary', {})
        if artwork_data and 'url' in artwork_data:
            artwork_url = artwork_data['url'].replace('{w}', '200').replace('{h}', '200').replace('{c}','bb').replace('{f}', 'jpg')

    is_explicit = item.get('showExplicitBadge', False)
    track_count = item.get('trackCount')
    duration_ms = item.get('duration')
    duration_str = format_duration(duration_ms)

    return {
        'title': title,
        'artist': artist,
        'type': item_type,
        'duration': duration_str,
        'track_count': track_count,
        'url': url,
        'thumbnail': artwork_url,
        'explicit': is_explicit
    }

def search_apple_music(search_term):
    """
    Scrapes and returns formatted "Top Results", "Artists", "Albums", and "Songs" sections.
    """
    url = f"https://music.apple.com/us/search?term={requests.utils.quote(search_term)}"
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }

    try:
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        soup = BeautifulSoup(response.content, 'html.parser')
        script_tag = soup.find('script', {'id': 'serialized-server-data'})
        
        if not script_tag:
            return {"error": "Could not find the data script tag."}

        data = json.loads(script_tag.string)[0]
        sections = data.get('data', {}).get('sections', [])
        
        if not sections:
            return {"error": "No search results found."}
            
        results = {}
        sections_to_process = ["Top Results", "Artists", "Albums", "Songs"]

        for section in sections:
            title = None
            header_item = section.get('header', {}).get('item', {})
            if header_item:
                title_link = header_item.get('titleLink')
                if title_link and isinstance(title_link, dict):
                    title = title_link.get('title')
                elif not title:
                    title = header_item.get('title')
            
            if title in sections_to_process:
                items = section.get('items', [])
                if items:
                    results[title] = [format_item(item) for item in items]
        
        return results

    except requests.exceptions.RequestException as e:
        return {"error": f"An error occurred while fetching the page: {e}"}
    except (json.JSONDecodeError, IndexError) as e:
        return {"error": f"An error occurred while parsing the data: {e}"}
    except Exception as e:
        return {"error": f"An unexpected error occurred: {e} on line {sys.exc_info()[-1].tb_lineno}"}

def search_musicbrainz(search_term):
    """
    Searches MusicBrainz for recordings and returns formatted results.
    """
    if not search_term.strip():
        return []

    try:
        # Search for recordings
        search_url = f"https://musicbrainz.org/ws/2/recording/?query={requests.utils.quote(search_term)}&fmt=json&limit=20"
        search_response = requests.get(search_url)
        search_response.raise_for_status()
        search_data = search_response.json()

        recordings = []
        for recording in search_data.get('recordings', []):
            artist_credit = recording.get('artist-credit', [{}])[0]
            artist = artist_credit.get('artist', {})
            
            recordings.append({
                'id': recording.get('id'),
                'title': recording.get('title'),
                'length': recording.get('length'),
                'artist': artist.get('name', 'Unknown Artist'),
                'artistId': artist.get('id'),
                'score': recording.get('score', 0),
                'releaseCount': len(recording.get('releases', []))
            })

        # Sort by score and release count
        recordings.sort(key=lambda x: (x['score'], x['releaseCount']), reverse=True)
        
        top_recordings = recordings[:15]

        # Fetch cover art for top recordings in parallel
        def fetch_cover(recording):
            try:
                # Get release info to find a cover art
                release_url = f"https://musicbrainz.org/ws/2/recording/{recording['id']}?inc=releases&fmt=json"
                release_response = requests.get(release_url, timeout=5)
                release_response.raise_for_status()
                release_data = release_response.json()

                releases = release_data.get('releases', [])
                if releases:
                    # Sort releases by date to get the most recent one
                    releases.sort(key=lambda r: r.get('date', '0'), reverse=True)
                    release_id = releases[0].get('id')
                    
                    # Fetch cover art from Cover Art Archive
                    cover_art_url = f"https://coverartarchive.org/release/{release_id}/front-250"
                    cover_art_response = requests.head(cover_art_url, allow_redirects=True, timeout=5)
                    
                    if cover_art_response.status_code == 200:
                        recording['coverArt'] = cover_art_response.url
                        recording['releaseDate'] = releases[0].get('date')
                        recording['album'] = releases[0].get('title')
            except requests.exceptions.RequestException as e:
                # Log error but continue, as cover art is not critical
                print(f"Could not fetch cover art for {recording['id']}: {e}")
            return recording

        with ThreadPoolExecutor(max_workers=10) as executor:
            results_with_cover = list(executor.map(fetch_cover, top_recordings))
            
        return results_with_cover

    except requests.exceptions.RequestException as e:
        return {"error": f"An error occurred while fetching data from MusicBrainz: {e}"}
    except (json.JSONDecodeError, IndexError) as e:
        return {"error": f"An error occurred while parsing MusicBrainz data: {e}"}
    except Exception as e:
        return {"error": f"An unexpected error occurred during MusicBrainz search: {e}"}


class SearchService:
    def search(self, provider: str, query: str):
        if provider == "apple_music":
            return search_apple_music(query)
        if provider == "musicbrainz":
            return search_musicbrainz(query)
        # Add other providers here in the future
        return {"error": "Invalid search provider."}

search_service = SearchService()