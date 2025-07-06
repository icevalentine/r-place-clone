import os

files = sorted([f for f in os.listdir() if f.endswith('.png')])

with open("files.txt", "w", encoding="utf-8") as f:
    for file in files:
        f.write(f"file '{file}'\n")
        f.write("duration 0.1\n")  # 10 frames per second

    # Lặp lại file cuối cùng 1 lần để đảm bảo video không bị cắt sớm
    f.write(f"file '{files[-1]}'\n")
    f.write("duration 9.0\n")

    # Lặp lại file cuối để đảm bảo ffmpeg không cắt đoạn cuối
    f.write(f"file '{files[-1]}'\n")
    f.write("duration 9.0\n")

    f.write(f"file '{files[-1]}'\n")
    f.write("duration 9.0\n")
    f.write(f"file '{files[-1]}'\n")
