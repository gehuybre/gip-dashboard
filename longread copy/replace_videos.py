#!/usr/bin/env python3
"""
Video Replacement Script for GIP Longread
Replaces YouTube iframes with local video elements
"""

import re
import sys
from pathlib import Path

def replace_youtube_with_local_video(html_content, video_mapping):
    """
    Replace YouTube iframe with local video element
    
    video_mapping format:
    {
        'SkD3ByELFOg': {
            'filename': 'oosterweelverbinding.mp4',
            'title': 'Oosterweelverbinding - Plaatsing Boogbrug'
        },
        ...
    }
    """
    
    for youtube_id, video_info in video_mapping.items():
        # Pattern to match YouTube iframe
        pattern = f'<iframe src="https://www\\.youtube\\.com/embed/{youtube_id}[^"]*"[^>]*>[^<]*</iframe>'
        
        # Replacement video element
        replacement = f'''<video autoplay muted loop playsinline preload="metadata" 
               title="{video_info['title']}"
               class="video-player">
            <source src="assets/{video_info['filename']}" type="video/mp4">
            <p>Your browser doesn't support HTML5 video. <a href="assets/{video_info['filename']}">Download the video</a> instead.</p>
        </video>'''
        
        html_content = re.sub(pattern, replacement, html_content, flags=re.DOTALL)
    
    return html_content

def main():
    # Define video mapping
    video_mapping = {
        'SkD3ByELFOg': {
            'filename': 'oosterweelverbinding.mp4',
            'title': 'Oosterweelverbinding - Plaatsing Boogbrug'
        },
        'qrBBvFzqwps': {
            'filename': 'ring-brussel.mp4', 
            'title': 'Ring rond Brussel - Modernisering Knooppunten'
        },
        'ishQNmTE6jg': {
            'filename': 'fietssnelwegen.mp4',
            'title': 'Fietssnelweg F24 Leuven-Tienen'
        },
        'sRQUF4YNV_8': {
            'filename': 'waterbeheersing.mp4',
            'title': 'Sigmaplan Vlassenbroek'
        },
        'W50BVTXdTcE': {
            'filename': 'albertkanaal.mp4',
            'title': 'Albertkanaal Bruggen'
        }
    }
    
    # File paths
    html_file = Path('index.html')
    backup_file = Path('index.html.backup')
    
    if not html_file.exists():
        print("❌ index.html niet gevonden!")
        sys.exit(1)
    
    # Create backup
    with open(html_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    with open(backup_file, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"✅ Backup gemaakt: {backup_file}")
    
    # Check which videos exist
    assets_dir = Path('assets')
    if not assets_dir.exists():
        assets_dir.mkdir()
        print(f"📁 Assets directory gemaakt: {assets_dir}")
    
    existing_videos = []
    missing_videos = []
    
    for youtube_id, video_info in video_mapping.items():
        video_path = assets_dir / video_info['filename']
        if video_path.exists():
            existing_videos.append((youtube_id, video_info))
        else:
            missing_videos.append(video_info['filename'])
    
    if missing_videos:
        print("⚠️  Ontbrekende video bestanden:")
        for filename in missing_videos:
            print(f"   - assets/{filename}")
        
        if not existing_videos:
            print("\nVoeg deze bestanden toe en run het script opnieuw.")
            return
        else:
            print(f"\n✅ Vervang wel de {len(existing_videos)} beschikbare video's? (y/n): ", end="")
            response = input().lower().strip()
            if response not in ['y', 'yes', 'ja', 'j']:
                print("Geannuleerd.")
                return
    
    # Replace videos
    modified_content = replace_youtube_with_local_video(content, dict(existing_videos))
    
    # Write updated content
    with open(html_file, 'w', encoding='utf-8') as f:
        f.write(modified_content)
    
    print(f"✅ {len(existing_videos)} YouTube video's vervangen door lokale video's!")
    print("📋 Vervangen:")
    for youtube_id, video_info in existing_videos:
        print(f"   - {video_info['title']} → {video_info['filename']}")

if __name__ == "__main__":
    main()