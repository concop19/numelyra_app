import os
import sys
import time
import sqlite3
import requests
from concurrent.futures import ThreadPoolExecutor, as_completed
from deep_translator import MyMemoryTranslator

sys.stdout.reconfigure(encoding='utf-8')

DB_PATH = 'assets/cadao.db'
HEADERS = {'User-Agent': 'NumelyraApp/1.0 (contact: admin@numelyra.com)'}

def main():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    # 1. Thêm cột biography_vi và biography_en nếu chưa có
    cols = [c[1] for c in cur.execute('PRAGMA table_info(representatives)').fetchall()]
    if 'biography_en' not in cols:
        print('Adding column biography_en...')
        cur.execute('ALTER TABLE representatives ADD COLUMN biography_en TEXT')
        cur.execute('UPDATE representatives SET biography_en = biography')
        conn.commit()

    if 'biography_vi' not in cols:
        print('Adding column biography_vi...')
        cur.execute('ALTER TABLE representatives ADD COLUMN biography_vi TEXT')
        conn.commit()

    rows = cur.execute('SELECT id, wikidata_qid, display_name, display_name_vi, biography_en, biography_vi FROM representatives').fetchall()
    print(f'Total figures in DB: {len(rows)}')

    # 2. Thu thập viwiki sitelinks từ Wikidata theo batch 50
    qids_to_process = [(r[0], r[1]) for r in rows if not r[5]]
    print(f'Figures needing Vietnamese bio: {len(qids_to_process)}')

    qid_to_id = {r[1]: r[0] for r in rows}
    qid_to_vi_title = {}

    print('Step A: Querying Wikidata for Vietnamese Wikipedia sitelinks...')
    chunk_size = 50
    chunks = [qids_to_process[i:i + chunk_size] for i in range(0, len(qids_to_process), chunk_size)]

    for idx, chunk in enumerate(chunks):
        chunk_qids = [item[1] for item in chunk]
        try:
            r = requests.get(
                'https://www.wikidata.org/w/api.php',
                params={
                    'action': 'wbgetentities',
                    'ids': '|'.join(chunk_qids),
                    'props': 'sitelinks',
                    'sitefilter': 'viwiki',
                    'format': 'json',
                },
                headers=HEADERS,
                timeout=20,
            ).json()

            for q, d in r.get('entities', {}).items():
                if 'viwiki' in d.get('sitelinks', {}):
                    vi_title = d['sitelinks']['viwiki']['title']
                    qid_to_vi_title[q] = vi_title
        except Exception as e:
            print(f'Error at chunk {idx}: {e}')
        time.sleep(0.05)

    print(f'Found {len(qid_to_vi_title)} figures with Vietnamese Wikipedia pages.')

    # 3. Lấy tóm tắt từ vi.wikipedia.org theo batch 40
    print('Step B: Fetching extracts from vi.wikipedia.org...')
    vi_items = list(qid_to_vi_title.items())
    title_to_extract = {}

    def fetch_extracts(titles_batch):
        try:
            res = requests.get(
                'https://vi.wikipedia.org/w/api.php',
                params={
                    'action': 'query',
                    'prop': 'extracts',
                    'exintro': '1',
                    'explaintext': '1',
                    'titles': '|'.join(titles_batch),
                    'format': 'json',
                },
                headers=HEADERS,
                timeout=20,
            ).json()
            for p in res.get('query', {}).get('pages', {}).values():
                t = p.get('title')
                ext = p.get('extract')
                if t and ext:
                    title_to_extract[t] = ext
        except Exception as e:
            print('Fetch error for titles:', e)

    vi_chunks = [vi_items[i:i + 40] for i in range(0, len(vi_items), 40)]
    with ThreadPoolExecutor(max_workers=5) as executor:
        futures = [executor.submit(fetch_extracts, [item[1] for item in c]) for c in vi_chunks]
        for f in as_completed(futures):
            pass

    print(f'Retrieved {len(title_to_extract)} Vietnamese summaries from vi.wikipedia.org.')

    # Cập nhật vào DB
    updated_wiki = 0
    for qid, title in qid_to_vi_title.items():
        extract = title_to_extract.get(title)
        if extract:
            fig_id = qid_to_id.get(qid)
            if fig_id:
                cur.execute(
                    'UPDATE representatives SET biography_vi = ?, display_name_vi = COALESCE(display_name_vi, ?) WHERE id = ?',
                    (extract, title, fig_id)
                )
                updated_wiki += 1
    conn.commit()
    print(f'Saved {updated_wiki} native Vietnamese biographies to database.')

    # 4. Đối với các nhân vật không có trang viwiki, dịch tóm tắt tiếng Anh sang tiếng Việt
    remaining = cur.execute('SELECT id, display_name, description, biography_en FROM representatives WHERE biography_vi IS NULL OR biography_vi = ""').fetchall()
    print(f'Step C: Translating remaining {len(remaining)} figures to Vietnamese...')

    translator = MyMemoryTranslator(source='en-US', target='vi-VN')

    def translate_one(row):
        fig_id, name, desc, bio_en = row
        text_to_trans = ''
        if bio_en:
            # Lấy đoạn đầu tiên (khoảng 350 ký tự) để dịch nhanh và chuẩn xác
            paragraphs = [p.strip() for p in bio_en.split('\n') if p.strip()]
            text_to_trans = paragraphs[0] if paragraphs else bio_en
            if len(text_to_trans) > 400:
                # Cắt theo câu hoàn chỉnh
                dot_idx = text_to_trans[:400].rfind('.')
                if dot_idx > 100:
                    text_to_trans = text_to_trans[:dot_idx + 1]
                else:
                    text_to_trans = text_to_trans[:400]
        elif desc:
            text_to_trans = f"{name} is known as: {desc}"

        if not text_to_trans:
            return fig_id, None

        try:
            vi_text = translator.translate(text_to_trans)
            return fig_id, vi_text
        except Exception as e:
            return fig_id, None

    translated_count = 0
    with ThreadPoolExecutor(max_workers=6) as executor:
        futures = {executor.submit(translate_one, r): r for r in remaining}
        for f in as_completed(futures):
            fig_id, vi_text = f.result()
            if vi_text:
                cur.execute('UPDATE representatives SET biography_vi = ? WHERE id = ?', (vi_text, fig_id))
                translated_count += 1
                if translated_count % 50 == 0:
                    conn.commit()
                    print(f'  Translated {translated_count} / {len(remaining)}...')

    conn.commit()
    print(f'Successfully translated and saved {translated_count} biographies.')

    # 5. Cập nhật cột biography chính mặc định = biography_vi (fallback biography_en)
    cur.execute('UPDATE representatives SET biography = COALESCE(biography_vi, biography_en)')
    conn.commit()

    # Kiểm tra lại số lượng
    cur.execute('SELECT COUNT(*) FROM representatives WHERE biography_vi IS NOT NULL AND biography_vi != ""')
    vi_total = cur.fetchone()[0]
    print(f'\n=== KẾT QUẢ CUỐI CÙNG ===')
    print(f'Tổng số nhân vật có tiểu sử tiếng Việt (biography_vi): {vi_total} / {len(rows)} ({vi_total / len(rows) * 100:.1f}%)')

    cur.execute('VACUUM')
    conn.close()
    print('Database vacuumed and closed successfully!')

if __name__ == '__main__':
    main()
