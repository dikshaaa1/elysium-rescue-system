import os

# Directory containing Python scripts
scripts_folder = 'D:\\Codes\\HACKATHON PROJECTS\\Elysium-RescueSystem\\Instagram'  # Change this to your folder path
output_file = 'combined_scripts.txt'

# Open the output file in write mode
with open(output_file, 'w') as outfile:
    # Iterate through each file in the folder
    for filename in os.listdir(scripts_folder):
        if filename.endswith('.py'):
            filepath = os.path.join(scripts_folder, filename)
            
            # Write the filename at the top of the file's content
            outfile.write(f"--- Start of {filename} ---\n")
            
            # Open the python file and write its content
            with open(filepath, 'r') as infile:
                for line in infile:
                    outfile.write(line)
            
            # Write a separator after the content of each script
            outfile.write(f"\n--- End of {filename} ---\n\n")

print(f"Combined all scripts into {output_file}")
