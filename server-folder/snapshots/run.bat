py makefile.py
ffmpeg -f concat -safe 0 -i files.txt -vf "scale=1080:1080:flags=neighbor" -vsync vfr -pix_fmt yuv420p -c:v libx264 timelapse.mp4
