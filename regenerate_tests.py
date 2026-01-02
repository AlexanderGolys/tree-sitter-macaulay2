import glob
import os
import subprocess
import re

corpus_dir = 'test/corpus'
files = glob.glob(os.path.join(corpus_dir, '*.txt'))

for file_path in files:
    filename = os.path.basename(file_path)
    if filename == 'basic.txt':
        continue
        
    print(f"Processing {filename}...")
    
    with open(file_path, 'r') as f:
        content = f.read()
    
    matches = re.finditer(r'^==================\n(.*?)\n==================\n(.*?)\n---', content, re.MULTILINE | re.DOTALL)
    
    new_content = ""
    
    for match in matches:
        test_name = match.group(1).strip()
        test_input = match.group(2).strip()
        
        with open('temp_input.m2', 'w') as tmp:
            tmp.write(test_input)
            
        try:
            result = subprocess.run(
                ['./node_modules/.bin/tree-sitter', 'parse', 'temp_input.m2'], 
                capture_output=True, 
                text=True
            )
            output = result.stdout.strip()
            
            start_index = output.find('(')
            if start_index != -1:
                s_expr = output[start_index:]
                # Remove ranges: [0, 0] - [0, 10]
                s_expr = re.sub(r'\s*\[\d+, \d+\] - \[\d+, \d+\]', '', s_expr)
            else:
                s_expr = "ERROR: Could not parse"
                print(f"Error parsing {test_name}: {result.stderr}")

        except Exception as e:
            s_expr = f"ERROR: {e}"
            print(f"Exception parsing {test_name}: {e}")
            
        new_content += f"==================\n{test_name}\n==================\n{test_input}\n---\n{s_expr}\n"

    with open(file_path, 'w') as f:
        f.write(new_content)

if os.path.exists('temp_input.m2'):
    os.remove('temp_input.m2')

