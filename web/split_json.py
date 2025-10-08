#!/usr/bin/env python3
"""
Split the large GIP projects JSON into smaller chunks for better browser compatibility
"""
import json
import math

def split_json_file():
    print("Loading large JSON file...")
    with open('gip_projects.json', 'r') as f:
        data = json.load(f)
    
    projects = data['projects']
    total_projects = len(projects)
    chunk_size = 100  # 100 projects per chunk
    num_chunks = math.ceil(total_projects / chunk_size)
    
    print(f"Splitting {total_projects} projects into {num_chunks} chunks of {chunk_size} each")
    
    # Create chunk files
    for i in range(num_chunks):
        start_idx = i * chunk_size
        end_idx = min((i + 1) * chunk_size, total_projects)
        chunk_projects = projects[start_idx:end_idx]
        
        chunk_data = {
            'chunk_info': {
                'chunk_number': i + 1,
                'total_chunks': num_chunks,
                'projects_in_chunk': len(chunk_projects),
                'start_index': start_idx,
                'end_index': end_idx - 1
            },
            'projects': chunk_projects
        }
        
        chunk_filename = f'projects_chunk_{i+1:02d}.json'
        with open(chunk_filename, 'w') as f:
            json.dump(chunk_data, f, indent=2)
        
        print(f"Created {chunk_filename} with {len(chunk_projects)} projects")
    
    # Create index file
    index_data = {
        'total_projects': total_projects,
        'total_chunks': num_chunks,
        'chunk_size': chunk_size,
        'chunks': [f'projects_chunk_{i+1:02d}.json' for i in range(num_chunks)],
        'stats': data['stats']
    }
    
    with open('projects_index.json', 'w') as f:
        json.dump(index_data, f, indent=2)
    
    print(f"Created projects_index.json with chunk information")
    print("Split complete!")

if __name__ == "__main__":
    split_json_file()