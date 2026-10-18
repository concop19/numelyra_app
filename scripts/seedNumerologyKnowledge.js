const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');

function readJson(...parts) {
  return JSON.parse(fs.readFileSync(path.join(projectRoot, ...parts), 'utf8'));
}

function markdown(reading) {
  return [
    '# TỔNG QUAN',
    reading.summary,
    '',
    '# ĐIỂM MẠNH',
    `- ${reading.strength}`,
    '',
    '# THÁCH THỨC',
    `- ${reading.challenge}`,
    '',
    '# LỜI KHUYÊN',
    reading.advice,
  ].join('\n');
}

function row(indicatorKey, numberValue, indicatorName, category, title, reading, keywords = []) {
  return {
    indicator_key: indicatorKey,
    number_value: numberValue,
    indicator_name: indicatorName,
    category,
    title,
    content: markdown(reading),
    keywords: Array.from(new Set([indicatorKey, numberValue, ...keywords])),
  };
}

function matrixRows(matrix) {
  const indicatorName = matrix.title;
  const rows = [];
  for (const [digit, entry] of Object.entries(matrix.numbers)) {
    for (const [state, reading] of Object.entries(entry.states)) {
      rows.push(row(
        matrix.matrixKey,
        `${digit}:${state}`,
        indicatorName,
        'chart',
        `${indicatorName} · Số ${digit} · ${state}`,
        reading,
        [digit, state, entry.theme]
      ));
    }
  }
  return rows;
}

function arrowRows(matrix) {
  const rows = [];
  for (const arrow of matrix.arrows) {
    for (const [state, reading] of Object.entries(arrow.states)) {
      rows.push(row(
        matrix.matrixKey,
        `${arrow.label}:${state}`,
        matrix.title,
        'chart',
        `${matrix.title} · ${arrow.label} · ${state}`,
        reading,
        [arrow.label, state, arrow.theme]
      ));
    }
  }
  return rows;
}

const master33 = {
  summary: 'Số Master 33/6 mang năng lượng chữa lành, phụng sự và tình thương có trách nhiệm ở tầng phát triển cao.',
  strength: 'Khả năng nâng đỡ, truyền dạy và tạo cảm giác an toàn cho cộng đồng.',
  challenge: 'Dễ ôm trách nhiệm quá mức, lý tưởng hóa vai trò cứu giúp hoặc kiệt sức cảm xúc.',
  advice: 'Phụng sự trong giới hạn lành mạnh, chăm sóc bản thân và biến lòng trắc ẩn thành hành động có cấu trúc.',
};

const manualRows = [
  row('walksOfLife', '33', 'Số Đường Đời', 'core', 'Đường đời 33/6', master33, ['master 33']),
  row('soul', '0', 'Số Linh Hồn', 'core', 'Linh hồn chưa hình thành', {
    summary: 'Họ tên không có nguyên âm được quy đổi nên chỉ số Linh hồn chưa hình thành một giá trị số độc lập.',
    strength: 'Động lực nội tâm có thể được quan sát thêm qua các chỉ số khác và nhu cầu được diễn đạt trực tiếp.',
    challenge: 'Thiếu dữ liệu nguyên âm làm cho việc diễn giải riêng chỉ số này không đủ tin cậy.',
    advice: 'Kiểm tra lại họ tên đầy đủ và không tự quy số 0 thành một nguyên mẫu từ 1 đến 9.',
  }),
  row('soul', '33', 'Số Linh Hồn', 'core', 'Linh hồn 33/6', master33, ['master 33']),
  row('personality', '0', 'Số Nhân Cách', 'core', 'Nhân cách chưa hình thành', {
    summary: 'Họ tên không có phụ âm được quy đổi nên chỉ số Nhân cách chưa hình thành một giá trị số độc lập.',
    strength: 'Cách biểu hiện ra ngoài có thể được quan sát thêm qua Sứ mệnh, Biểu đồ tên và bối cảnh giao tiếp.',
    challenge: 'Thiếu dữ liệu phụ âm làm cho việc diễn giải riêng chỉ số này không đủ tin cậy.',
    advice: 'Kiểm tra lại họ tên đầy đủ và không tự quy số 0 thành một nguyên mẫu từ 1 đến 9.',
  }),
  row('personality', '33', 'Số Nhân Cách', 'core', 'Nhân cách 33/6', master33, ['master 33']),
  row('mature', '33', 'Số Trưởng Thành', 'potential', 'Trưởng thành 33/6', master33, ['master 33']),
  row('subconsciousPower', '1', 'Sức Mạnh Tiềm Thức', 'potential', 'Sức mạnh tiềm thức 1', {
    summary: 'Chỉ một nhóm năng lượng hiện diện trong tên cho thấy phản xạ tiềm thức đang dựa vào một cách ứng phó rất tập trung.',
    strength: 'Có thể nhận ra nhanh điểm tựa quen thuộc của bản thân khi gặp áp lực.',
    challenge: 'Kho lựa chọn phản ứng còn hẹp, dễ lúng túng khi cách quen thuộc không còn hiệu quả.',
    advice: 'Chủ động học thêm kỹ năng mới và luyện phản ứng thay thế trong các tình huống nhỏ, an toàn.',
  }),
  row('subconsciousPower', '2', 'Sức Mạnh Tiềm Thức', 'potential', 'Sức mạnh tiềm thức 2', {
    summary: 'Hai nhóm năng lượng hiện diện trong tên tạo một nền phản xạ tiềm thức còn chuyên biệt và cần được mở rộng dần.',
    strength: 'Có hai nguồn lực quen thuộc để luân phiên sử dụng khi xử lý thử thách.',
    challenge: 'Có thể thiếu linh hoạt trước tình huống đòi hỏi phẩm chất nằm ngoài hai nhóm năng lượng này.',
    advice: 'Xác định các số thiếu và chọn một kỹ năng cụ thể để rèn trong từng giai đoạn.',
  }),
  row('karmicDebts', 'none', 'Con Số Nợ Nghiệp', 'karmic', 'Không ghi nhận nợ nghiệp', {
    summary: 'Hồ sơ không ghi nhận bốn nợ nghiệp cốt lõi 13/4, 14/5, 16/7 hoặc 19/1 trong các tổng số được kiểm tra.',
    strength: 'Có thể tập trung phát triển các chỉ số đang hiện diện mà không tự gán một món nợ nghiệp không có trong hồ sơ.',
    challenge: 'Không có nợ nghiệp không đồng nghĩa với không có thử thách hoặc bài học phát triển.',
    advice: 'Đọc Bài học số thiếu và 4 Thách thức cuộc đời để nhận diện đúng vùng cần rèn luyện.',
  }),
  row('missingNumbers', 'none', 'Bài Học Số Thiếu', 'karmic', 'Không có số thiếu', {
    summary: 'Biểu đồ tên hiện có đủ cả chín nhóm năng lượng từ 1 đến 9 nên không ghi nhận bài học số thiếu.',
    strength: 'Phổ năng lượng tên tương đối đầy đủ, tạo nhiều cách biểu đạt và thích nghi.',
    challenge: 'Sự hiện diện đầy đủ không bảo đảm cân bằng; số xuất hiện quá nhiều vẫn có thể tạo xu hướng cực đoan.',
    advice: 'Xem Biểu đồ tên và tần suất để nhận diện số nổi trội và điều chỉnh cách biểu đạt.',
  }),
  row('bridgeSoulPersonality', '9', 'Cầu Nối Linh Hồn - Nhân Cách', 'bridge', 'Cầu nối số 9', {
    summary: 'Khoảng cách 9 là trường hợp biên khi một phía chưa hình thành giá trị và phía còn lại mang năng lượng số 9.',
    strength: 'Tầm nhìn bao quát có thể giúp kết nối động lực bên trong với cách thể hiện ra ngoài.',
    challenge: 'Chênh lệch lớn dễ tạo cảm giác khó được thấu hiểu nếu họ tên hoặc nhu cầu chưa được diễn đạt đầy đủ.',
    advice: 'Kiểm tra dữ liệu họ tên trước, sau đó luyện diễn đạt nhu cầu và hành động theo cùng một thông điệp.',
  }),
];

function main() {
  const nameChart = readJson('src', 'data', 'numerologyMatrices', 'nameChart.vi.json');
  const birthChart = readJson('src', 'data', 'numerologyMatrices', 'birthChart.vi.json');
  const arrows = readJson('src', 'data', 'numerologyMatrices', 'arrows.vi.json');
  const rows = [
    ...manualRows,
    ...matrixRows(nameChart),
    ...matrixRows(birthChart),
    ...arrowRows(arrows),
  ];

  if (process.argv.includes('--json')) process.stdout.write(JSON.stringify(rows));
  else console.log(`[numerology-supplement] ${rows.length} local supplement rows.`);
}

main();
