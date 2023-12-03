import subprocess
import os

def convert_avi_to_mp4(avi_file_path, output_name):
    print(f"Converting {avi_file_path} to {output_name}.mp4")
    subprocess.call(['ffmpeg', '-i', os.path.join(os.getcwd(), avi_file_path), os.path.join(os.getcwd(), output_name + '.mp4')])

def convert_all_videos_to_mp4():
    video_dir = os.path.join(os.getcwd(), 'jsmecavideo/videos')
    print("Starting conversion of all videos to mp4 in "+ video_dir)
    for file in os.listdir(video_dir):
        if file.endswith(".avi"):
            output_name = os.path.splitext(file)[0]
            print(f"Found .avi file: {file}, converting to {output_name}.mp4")
            convert_avi_to_mp4(os.path.join('jsmecavideo/videos', file), output_name)
    print("Finished conversion of all videos to mp4")

convert_all_videos_to_mp4()

