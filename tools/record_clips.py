"""Record combo-lab moments as video, side by side with the same race without the item.

    python3 tools/record_clips.py clips.json out_dir

clips.json is a list of {"slug", "parts", "seed", "at", "caption", "wild"?}. Needs the
game served at http://localhost:8080 (npm start), Python Playwright, Chrome and ffmpeg.
Each clip is rendered frame by frame (not screen-captured), so it's smooth and exact.
"""
import asyncio, base64, json, os, subprocess, sys
from playwright.async_api import async_playwright

URL = 'http://localhost:8080/tools/replay.html?manual=1'
FPS = 30
SECONDS = 8
CHROME = os.environ.get('CHROME', '/usr/bin/google-chrome')

RENDER = """async ({ opts, frames }) => {
  const c = document.createElement('canvas');
  const r = new window.Replay(c, opts);
  const out = [];
  for (let i = 0; i < frames; i++) { r.frame(1 / 30); out.push(c.toDataURL('image/png').split(',')[1]); }
  return { frames: out, start: r.startPlace, end: r.target.position, name: r.name };
}"""


async def render(page, opts, frames, folder):
    os.makedirs(folder, exist_ok=True)
    result = await page.evaluate(RENDER, {'opts': opts, 'frames': frames})
    for i, data in enumerate(result['frames']):
        with open(os.path.join(folder, f'{i:04d}.png'), 'wb') as f:
            f.write(base64.b64decode(data))
    return result


async def main(spec_path, out_dir):
    clips = json.load(open(spec_path))
    os.makedirs(out_dir, exist_ok=True)
    frames = int(FPS * SECONDS)
    summary = []
    async with async_playwright() as p:
        browser = await p.chromium.launch(executable_path=CHROME)
        page = await browser.new_page()
        await page.goto(URL)
        await page.wait_for_function('typeof window.Replay === "function"')
        for clip in clips:
            base = {'seed': clip['seed'], 'at': clip['at'], 'wild': clip.get('wild', False)}
            tmp = os.path.join(out_dir, '_frames', clip['slug'])
            withit = await render(page, {**base, 'parts': clip['parts'], 'caption': clip['caption']}, frames, os.path.join(tmp, 'with'))
            without = await render(page, {**base, 'parts': None, 'caption': 'SAME RACE, NO ITEM'}, frames, os.path.join(tmp, 'without'))
            video = os.path.join(out_dir, f"{clip['slug']}.mp4")
            subprocess.run([
                'ffmpeg', '-y', '-loglevel', 'error', '-framerate', str(FPS), '-i', os.path.join(tmp, 'with', '%04d.png'),
                '-framerate', str(FPS), '-i', os.path.join(tmp, 'without', '%04d.png'),
                '-filter_complex', '[0:v]scale=960:540:flags=neighbor[a];[1:v]scale=480:270:flags=neighbor,pad=480:540:0:135:black[b];[a][b]hstack',
                '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '26', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', video,
            ], check=True)
            poster = os.path.join(out_dir, f"{clip['slug']}.png")
            subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-ss', '2.5', '-i', video, '-frames:v', '1', poster], check=True)
            summary.append({**clip, 'start': withit['start'], 'end': withit['end'], 'endWithout': without['end'], 'name': withit['name']})
            print(f"{clip['slug']}: {withit['name']} {withit['start']} -> {withit['end']} (no item: {without['end']})")
        await browser.close()
    json.dump(summary, open(os.path.join(out_dir, 'clips.json'), 'w'), indent=1)


if __name__ == '__main__':
    asyncio.run(main(sys.argv[1], sys.argv[2]))
