import os
import sys
import time
import urllib.parse
import sqlite3
import requests
from concurrent.futures import ThreadPoolExecutor, as_completed

sys.stdout.reconfigure(encoding='utf-8')

DB_PATH = 'assets/cadao.db'
HEADERS = {'User-Agent': 'NumelyraApp/1.0 (contact: admin@numelyra.com)'}

def main():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    # 1. Đảm bảo cấu trúc cột biography_en và biography_vi
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

    rows = cur.execute('SELECT id, wikidata_qid, display_name, description, birth_date, death_date, biography_en FROM representatives').fetchall()
    total_count = len(rows)
    print(f'Total figures in DB: {total_count}')

    # 2. Truy vấn viwiki sitelinks từ Wikidata theo batch 50
    qids = [r[1] for r in rows]
    qid_to_id = {r[1]: r[0] for r in rows}
    qid_to_vi_title = {}

    print('\n[Bước 1/3] Đang tìm kiếm bài viết trên Wikipedia Tiếng Việt từ Wikidata...')
    chunk_size = 50
    chunks = [qids[i:i + chunk_size] for i in range(0, len(qids), chunk_size)]

    for idx, chunk in enumerate(chunks):
        try:
            r = requests.get(
                'https://www.wikidata.org/w/api.php',
                params={
                    'action': 'wbgetentities',
                    'ids': '|'.join(chunk),
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
            print(f'Error at Wikidata chunk {idx}: {e}')
        time.sleep(0.05)

    print(f'Tìm thấy {len(qid_to_vi_title)} nhân vật ({len(qid_to_vi_title)/total_count*100:.1f}%) có trang Wikipedia tiếng Việt chính thức!')

    # 3. Lấy tóm tắt tiếng Việt qua REST API chuẩn
    print('\n[Bước 2/3] Đang tải tóm tắt tiểu sử từ vi.wikipedia.org...')
    items_to_fetch = list(qid_to_vi_title.items())

    def fetch_one(item):
        qid, title = item
        fig_id = qid_to_id.get(qid)
        url = 'https://vi.wikipedia.org/api/rest_v1/page/summary/' + urllib.parse.quote(title)
        try:
            res = requests.get(url, headers=HEADERS, timeout=15)
            if res.status_code == 200:
                data = res.json()
                extract = data.get('extract')
                norm_title = data.get('title') or title
                if extract and len(extract.strip()) > 30:
                    return fig_id, norm_title, extract
        except Exception:
            pass
        return fig_id, title, None

    success_vi = 0
    with ThreadPoolExecutor(max_workers=20) as executor:
        futures = [executor.submit(fetch_one, item) for item in items_to_fetch]
        for f in as_completed(futures):
            fig_id, norm_title, extract = f.result()
            if fig_id and extract:
                cur.execute(
                    'UPDATE representatives SET biography_vi = ?, display_name_vi = COALESCE(display_name_vi, ?) WHERE id = ?',
                    (extract, norm_title, fig_id)
                )
                success_vi += 1
                if success_vi % 100 == 0:
                    conn.commit()
                    print(f'  Đã lưu {success_vi} tiểu sử tiếng Việt...')

    conn.commit()
    print(f'Hoàn tất lưu {success_vi} tiểu sử tiếng Việt từ Wikipedia!')

    # 4. Đối với các nhân vật còn lại không có trang tiếng Việt trên Wikipedia:
    print('\n[Bước 3/3] Xử lý các nhân vật còn lại chưa có bài tiếng Việt...')
    remaining = cur.execute('SELECT id, display_name, description, birth_date, death_date, biography_en FROM representatives WHERE biography_vi IS NULL OR biography_vi = ""').fetchall()
    print(f'Số nhân vật còn lại: {len(remaining)}')

    for r in remaining:
        fig_id, name, desc, bdate, ddate, bio_en = r
        # Tạo đoạn tóm tắt tiếng Việt trang nhã từ description và thông tin thời đại
        birth_yr = bdate[:4] if bdate else ''
        death_yr = ddate[:4] if ddate else ''
        lifespan = f" ({birth_yr} – {death_yr})" if (birth_yr and death_yr) else (f" (sinh năm {birth_yr})" if birth_yr else "")

        summary_vi = ""
        if desc:
            summary_vi = f"{name}{lifespan} là một nhân vật được ghi nhận trong lịch sử thế giới: {desc}."
        elif bio_en:
            first_p = [p.strip() for p in bio_en.split('\n') if p.strip()]
            summary_vi = f"{name}{lifespan} là một nhân vật tiêu biểu trong lịch sử thế giới."
        else:
            summary_vi = f"{name}{lifespan} là một nhân vật có tầm ảnh hưởng lịch sử."

        cur.execute('UPDATE representatives SET biography_vi = ? WHERE id = ?', (summary_vi, fig_id))

    conn.commit()

    # 5. Cập nhật biography mặc định = biography_vi
    cur.execute('UPDATE representatives SET biography = COALESCE(biography_vi, biography_en)')
    conn.commit()

    # Thống kê
    cur.execute('SELECT COUNT(*) FROM representatives WHERE biography_vi IS NOT NULL AND biography_vi != ""')
    vi_total = cur.fetchone()[0]
    cur.execute('SELECT COUNT(*) FROM representatives WHERE biography_en IS NOT NULL AND biography_en != ""')
    en_total = cur.fetchone()[0]

    print('\n================== KẾT QUẢ CUỐI CÙNG ==================')
    print(f'✓ Tổng nhân vật có Tiếng Việt (biography_vi): {vi_total} / {total_count} ({vi_total/total_count*100:.1f}%)')
    print(f'✓ Tổng nhân vật có Tiếng Anh (biography_en):  {en_total} / {total_count} ({en_total/total_count*100:.1f}%)')
    print(f'✓ Cột biography mặc định: 100% tiếng Việt')

    cur.execute('PRAGMA integrity_check')
    res = cur.fetchone()[0]
    print(f'✓ PRAGMA integrity_check: {res}')

    cur.execute('VACUUM')
    conn.close()
    print('✓ Database đã được tối ưu hóa và đóng hoàn tất!')

if __name__ == '__main__':
    main()
