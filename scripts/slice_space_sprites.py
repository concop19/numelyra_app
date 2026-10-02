import os
from PIL import Image
import numpy as np

def clean_alpha(img_rgba, min_alpha=50):
    arr = np.array(img_rgba)
    mask = arr[:, :, 3] < min_alpha
    arr[mask] = [0, 0, 0, 0]
    return Image.fromarray(arr, 'RGBA')

def crop_content(img, bbox, min_alpha=50):
    cropped = img.crop(bbox)
    cleaned = clean_alpha(cropped, min_alpha)
    bbox_inner = cleaned.getbbox()
    if bbox_inner:
        return cleaned.crop(bbox_inner)
    return cleaned

def main():
    source_path = 'assets/image/ChatGPT Image Sep 30, 2026, 09_28_25 AM-1.png'
    out_dir = 'assets/games/space-arrow'
    os.makedirs(out_dir, exist_ok=True)
    os.makedirs(os.path.join(out_dir, 'thrusters'), exist_ok=True)
    os.makedirs(os.path.join(out_dir, 'enemies'), exist_ok=True)
    os.makedirs(os.path.join(out_dir, 'projectiles'), exist_ok=True)
    os.makedirs(os.path.join(out_dir, 'powerups'), exist_ok=True)
    os.makedirs(os.path.join(out_dir, 'explosions'), exist_ok=True)
    os.makedirs(os.path.join(out_dir, 'puzzle'), exist_ok=True)

    img = Image.open(source_path)

    # 1. Player Ship (threshold 90 for razor sharp outline)
    player_ship = crop_content(img, (10, 10, 350, 330), min_alpha=90)
    player_ship.save(os.path.join(out_dir, 'player_ship.png'), 'PNG')
    print('Saved player_ship.png:', player_ship.size)

    # 2. Thrusters (4 frames, threshold 40 to preserve glow)
    th_w = (850 - 370) / 4
    for i in range(4):
        x0 = int(370 + i * th_w)
        x1 = int(370 + (i + 1) * th_w)
        th_frame = crop_content(img, (x0, 50, x1, 320), min_alpha=40)
        th_frame.save(os.path.join(out_dir, 'thrusters', f'thruster_{i}.png'), 'PNG')
        print(f'Saved thruster_{i}.png:', th_frame.size)

    # 3. Enemies (3 tiers x 2 frames, threshold 85)
    en_names = ['minion_blue', 'armored_purple', 'boss_teal']
    en_w = (1520 - 880) / 3
    en_h = (325 - 15) / 2
    for col, name in enumerate(en_names):
        for row in range(2):
            x0 = int(880 + col * en_w)
            x1 = int(880 + (col + 1) * en_w)
            y0 = int(15 + row * en_h)
            y1 = int(15 + (row + 1) * en_h)
            en_frame = crop_content(img, (x0, y0, x1, y1), min_alpha=85)
            en_frame.save(os.path.join(out_dir, 'enemies', f'{name}_{row}.png'), 'PNG')
            print(f'Saved {name}_{row}.png:', en_frame.size)

    # 4. Projectiles
    bullet_normal = crop_content(img, (60, 360, 130, 480), min_alpha=40)
    bullet_normal.save(os.path.join(out_dir, 'projectiles', 'bullet_normal.png'), 'PNG')

    bullet_scatter = crop_content(img, (180, 360, 270, 480), min_alpha=40)
    bullet_scatter.save(os.path.join(out_dir, 'projectiles', 'bullet_scatter.png'), 'PNG')

    egg_bomb = crop_content(img, (320, 360, 440, 480), min_alpha=85)
    egg_bomb.save(os.path.join(out_dir, 'projectiles', 'egg_bomb.png'), 'PNG')

    egg_cracked = crop_content(img, (40, 490, 150, 620), min_alpha=85)
    egg_cracked.save(os.path.join(out_dir, 'projectiles', 'egg_cracked.png'), 'PNG')

    shield_bubble = crop_content(img, (160, 490, 300, 620), min_alpha=35)
    shield_bubble.save(os.path.join(out_dir, 'projectiles', 'shield_bubble.png'), 'PNG')

    sparkle_fx = crop_content(img, (310, 490, 450, 620), min_alpha=40)
    sparkle_fx.save(os.path.join(out_dir, 'projectiles', 'sparkle_fx.png'), 'PNG')

    # 5. Powerups (4 orbs, threshold 80)
    pow_names = ['scatter_orb', 'shield_orb', 'health_orb', 'bomb_orb']
    pow_w = (950 - 490) / 4
    for i, name in enumerate(pow_names):
        x0 = int(490 + i * pow_w)
        x1 = int(490 + (i + 1) * pow_w)
        p_orb = crop_content(img, (x0, 400, x1, 590), min_alpha=80)
        p_orb.save(os.path.join(out_dir, 'powerups', f'{name}.png'), 'PNG')
        print(f'Saved powerup {name}.png:', p_orb.size)

    # 6. Explosions (8 frames, threshold 40)
    exp_w = (1520 - 980) / 4
    exp_h = (640 - 350) / 2
    for idx in range(8):
        col = idx % 4
        row = idx // 4
        x0 = int(980 + col * exp_w)
        x1 = int(980 + (col + 1) * exp_w)
        y0 = int(350 + row * exp_h)
        y1 = int(350 + (row + 1) * exp_h)
        exp_frame = crop_content(img, (x0, y0, x1, y1), min_alpha=40)
        exp_frame.save(os.path.join(out_dir, 'explosions', f'explosion_{idx}.png'), 'PNG')
        print(f'Saved explosion_{idx}.png:', exp_frame.size)

    # 7. Space Background
    bg_tile = img.crop((9, 671, 474, 999))
    bg_tile.save(os.path.join(out_dir, 'space_bg.png'), 'PNG')
    print('Saved space_bg.png:', bg_tile.size)

    # 8. Checkpoints
    chk_w = (940 - 490) / 3
    for i in range(3):
        x0 = int(490 + i * chk_w)
        x1 = int(490 + (i + 1) * chk_w)
        chk = crop_content(img, (x0, 700, x1, 900), min_alpha=80)
        chk.save(os.path.join(out_dir, 'puzzle', f'checkpoint_{i+1}.png'), 'PNG')
        print(f'Saved checkpoint_{i+1}.png:', chk.size)

    # 9. Path Head Comet
    path_head = crop_content(img, (960, 700, 1200, 900), min_alpha=50)
    path_head.save(os.path.join(out_dir, 'puzzle', 'path_head.png'), 'PNG')

    # 10. Puzzle Tile
    puzzle_tile = crop_content(img, (1240, 680, 1530, 950), min_alpha=80)
    puzzle_tile.save(os.path.join(out_dir, 'puzzle', 'puzzle_tile.png'), 'PNG')

    print('ALL RE-SLICED WITH HIGH FIDELITY!')

if __name__ == '__main__':
    main()
