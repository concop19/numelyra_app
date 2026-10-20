export interface SpecialIndicatorReading {
  title: string;
  overview: string;
  strengths: string[];
  challenges: string[];
  advice: string;
  fullContent?: string;
}

type KarmicDebtCode = '13/4' | '14/5' | '16/7' | '19/1';

const KARMIC_DEBT_DATA: Record<KarmicDebtCode, {
  theme: string;
  overview: string;
  strength: string;
  challenge: string;
  advice: string;
}> = {
  '13/4': {
    theme: 'Kỷ luật và bền bỉ',
    overview: 'Nợ nghiệp 13/4 nhấn mạnh bài học biến sự trì hoãn hoặc xu hướng tìm đường tắt thành tinh thần làm việc có phương pháp.',
    strength: 'Khả năng xây nền tảng chắc chắn và tạo thành quả lâu dài khi duy trì kỷ luật.',
    challenge: 'Dễ nản trước công việc lặp lại, bỏ dở giữa chừng hoặc muốn có kết quả quá nhanh.',
    advice: 'Chia mục tiêu thành bước nhỏ, hoàn thành đều đặn và coi tính nhất quán là năng lực cốt lõi.',
  },
  '14/5': {
    theme: 'Tự do có trách nhiệm',
    overview: 'Nợ nghiệp 14/5 đặt trọng tâm vào việc làm chủ ham muốn, thói quen và nhu cầu thay đổi để tự do không biến thành mất cân bằng.',
    strength: 'Khả năng thích nghi nhanh, đổi mới và truyền cảm hứng khi biết tự điều tiết.',
    challenge: 'Dễ quá đà, chóng chán, phân tán cam kết hoặc tìm kích thích để né tránh giới hạn.',
    advice: 'Thiết lập ranh giới rõ ràng, giữ một vài thói quen neo và lựa chọn thay đổi có chủ đích.',
  },
  '16/7': {
    theme: 'Khiêm nhường và thức tỉnh',
    overview: 'Nợ nghiệp 16/7 gợi bài học hạ bớt cái tôi, nhìn xuyên qua ảo tưởng và trưởng thành từ những lần niềm tin cũ bị thử thách.',
    strength: 'Chiều sâu nội tâm, khả năng tự quan sát và tái thiết đời sống trên nền tảng chân thật.',
    challenge: 'Có thể khép kín, tự ái, lý tưởng hóa hoặc khó chấp nhận khi thực tế không đúng kỳ vọng.',
    advice: 'Thực hành phản tỉnh, đón nhận góp ý và xây niềm tin bằng sự chân thành thay vì kiểm soát.',
  },
  '19/1': {
    theme: 'Độc lập trong hợp tác',
    overview: 'Nợ nghiệp 19/1 yêu cầu cân bằng giữa sức mạnh cá nhân và tinh thần cộng tác, không dùng quyền tự chủ để tách mình khỏi người khác.',
    strength: 'Năng lực tự lập, tiên phong và dẫn dắt bằng trải nghiệm thực tế.',
    challenge: 'Dễ độc đoán, ngại nhờ hỗ trợ hoặc chỉ tin vào cách làm của bản thân.',
    advice: 'Chủ động lắng nghe, chia sẻ quyền quyết định và dùng năng lực lãnh đạo để nâng đỡ tập thể.',
  },
};

const MISSING_NUMBER_DATA: Record<number, {
  theme: string;
  overview: string;
  strength: string;
  challenge: string;
  advice: string;
}> = {
  1: {
    theme: 'Tự chủ',
    overview: 'Số 1 thiếu cho thấy năng lượng khởi xướng và khả năng khẳng định nhu cầu cần được rèn luyện có ý thức.',
    strength: 'Có thể phát triển kiểu lãnh đạo biết lắng nghe thay vì hành động theo bản năng.',
    challenge: 'Dễ ngại bắt đầu, khó nói rõ mong muốn hoặc chờ người khác quyết định.',
    advice: 'Tự đưa ra một lựa chọn nhỏ mỗi ngày và diễn đạt nhu cầu bằng câu trực tiếp.',
  },
  2: {
    theme: 'Tinh tế cảm xúc',
    overview: 'Số 2 thiếu nhấn mạnh bài học nhận biết cảm xúc, kiên nhẫn và hợp tác trong các mối quan hệ.',
    strength: 'Có thể xây dựng sự thấu cảm lành mạnh mà không lệ thuộc vào cảm xúc người khác.',
    challenge: 'Dễ bỏ sót tín hiệu tinh tế hoặc khó nói về cảm xúc của chính mình.',
    advice: 'Luyện lắng nghe, gọi tên cảm xúc và hỏi lại để tránh suy đoán.',
  },
  3: {
    theme: 'Biểu đạt sáng tạo',
    overview: 'Số 3 thiếu gợi bài học đưa suy nghĩ và cảm xúc ra ngoài bằng lời nói, chữ viết hoặc hình thức sáng tạo phù hợp.',
    strength: 'Có thể xây dựng tiếng nói riêng sâu sắc thay vì biểu đạt chỉ để gây chú ý.',
    challenge: 'Dễ giữ ý tưởng trong đầu, thiếu tự tin khi trình bày hoặc khó duy trì niềm vui.',
    advice: 'Duy trì một hoạt động viết, kể chuyện, vẽ hoặc trình bày ngắn mỗi tuần.',
  },
  4: {
    theme: 'Kỷ luật thực tế',
    overview: 'Số 4 thiếu cho thấy cấu trúc, tính đều đặn và khả năng theo sát chi tiết là vùng cần chủ động bồi đắp.',
    strength: 'Có thể thiết kế hệ thống linh hoạt, phù hợp bản thân thay vì bị khuôn mẫu chi phối.',
    challenge: 'Dễ thiếu kế hoạch, bỏ sót chi tiết hoặc khó hoàn tất công việc dài hơi.',
    advice: 'Dùng lịch và danh sách ngắn; hoàn thành từng bước trước khi mở thêm mục tiêu mới.',
  },
  5: {
    theme: 'Cân bằng và thích nghi',
    overview: 'Số 5 thiếu đặt ra bài học giữ tâm điểm ổn định trong khi hoàn cảnh, kế hoạch hoặc cảm xúc thay đổi.',
    strength: 'Có thể tạo sự ổn định có chủ đích và đưa ra thay đổi sau khi cân nhắc.',
    challenge: 'Dễ cứng nhắc trước biến động hoặc ngược lại dao động khi thiếu điểm tựa.',
    advice: 'Giữ một vài thói quen neo và thử những thay đổi nhỏ, có giới hạn rõ ràng.',
  },
  6: {
    theme: 'Trách nhiệm và chăm sóc',
    overview: 'Số 6 thiếu nhấn mạnh bài học cân bằng trách nhiệm với gia đình, cộng đồng và nhu cầu của chính mình.',
    strength: 'Có thể học cách quan tâm người khác mà vẫn giữ ranh giới lành mạnh.',
    challenge: 'Dễ né cam kết chung hoặc lúng túng khi phải thể hiện sự chăm sóc.',
    advice: 'Nhận một trách nhiệm vừa sức và thống nhất kỳ vọng rõ ràng với người liên quan.',
  },
  7: {
    theme: 'Chiêm nghiệm và niềm tin',
    overview: 'Số 7 thiếu gợi bài học dừng lại để quan sát, rút kinh nghiệm và phát triển chiều sâu nội tâm.',
    strength: 'Có thể biến trải nghiệm thực tế thành trí tuệ khi chủ động nhìn lại.',
    challenge: 'Dễ lướt qua bài học, thiếu kiên nhẫn với tiến trình hoặc ngại ở một mình để suy ngẫm.',
    advice: 'Ghi lại điều đã học sau mỗi quyết định quan trọng và dành thời gian tĩnh lặng đều đặn.',
  },
  8: {
    theme: 'Quản trị nguồn lực',
    overview: 'Số 8 thiếu đặt trọng tâm vào việc quản lý tiền bạc, quyền hạn, mục tiêu và trách nhiệm đối với kết quả.',
    strength: 'Có thể định nghĩa thành công theo giá trị riêng thay vì chạy theo địa vị.',
    challenge: 'Dễ ngại quyết định, thiếu tự tin khi quản lý tài chính hoặc điều phối nguồn lực.',
    advice: 'Theo dõi một ngân sách đơn giản và đặt mục tiêu có con số, thời hạn cụ thể.',
  },
  9: {
    theme: 'Tầm nhìn và lòng bao dung',
    overview: 'Số 9 thiếu cho thấy việc mở rộng góc nhìn, hoàn tất điều cũ và kết nối mục tiêu cá nhân với cộng đồng là bài học quan trọng.',
    strength: 'Có thể phụng sự theo cách thực tế, tập trung vào tác động cụ thể.',
    challenge: 'Dễ nhìn vấn đề quá hẹp, khó buông bỏ hoặc thiếu động lực với mục tiêu dài hạn.',
    advice: 'Tập nhìn sự việc từ nhiều góc độ và tham gia một hoạt động cộng đồng vừa sức.',
  },
};

const NUMBER_THEMES: Record<number, string> = {
  0: 'hòa hợp sẵn có',
  1: 'tự chủ và khởi xướng',
  2: 'hợp tác và tinh tế',
  3: 'biểu đạt và sáng tạo',
  4: 'kỷ luật và nền tảng',
  5: 'tự do và thích nghi',
  6: 'trách nhiệm và chăm sóc',
  7: 'chiêm nghiệm và chiều sâu',
  8: 'quản trị và thành tựu',
  9: 'bao dung và hoàn tất',
  10: 'khởi đầu ở tầng phát triển mới',
  11: 'trực giác và soi sáng',
  22: 'kiến tạo tầm nhìn lớn',
  33: 'chữa lành và phụng sự',
};

function unique<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}

export function extractKarmicDebtCodes(value: string | number): KarmicDebtCode[] {
  const matches = String(value).match(/(?:13\/4|14\/5|16\/7|19\/1)/g) || [];
  return unique(matches as KarmicDebtCode[]);
}

export function extractMissingNumbers(value: string | number): number[] {
  const matches = String(value).match(/\d+/g) || [];
  return unique(matches.map(Number).filter((number) => number >= 1 && number <= 9));
}

function extractSequence(value: string | number): number[] {
  return (String(value).match(/\d+/g) || []).map(Number);
}

function toFullContent(reading: Omit<SpecialIndicatorReading, 'title' | 'fullContent'>): string {
  return [
    reading.overview,
    reading.strengths.length ? `\n\n**Điểm có thể phát huy:**\n${reading.strengths.map((item) => `- ${item}`).join('\n')}` : '',
    reading.challenges.length ? `\n\n**Thách thức cần lưu ý:**\n${reading.challenges.map((item) => `- ${item}`).join('\n')}` : '',
    reading.advice ? `\n\n**Gợi ý chuyển hóa:** ${reading.advice}` : '',
  ].join('');
}

export function getKarmicDebtSummary(value: string | number): string {
  const debts = extractKarmicDebtCodes(value);
  if (debts.length === 0) {
    return 'Không ghi nhận nợ nghiệp 13/4, 14/5, 16/7 hoặc 19/1 trong các tổng số được kiểm tra của hồ sơ này.';
  }
  return debts
    .map((debt) => `Nợ nghiệp ${debt}: ${KARMIC_DEBT_DATA[debt].theme.toLocaleLowerCase('vi-VN')}`)
    .join(' · ');
}

export function getMissingNumbersSummary(value: string | number): string {
  const numbers = extractMissingNumbers(value);
  if (numbers.length === 0) {
    return 'Tên gọi hiện tại có đủ năng lượng từ 1 đến 9; không ghi nhận bài học số thiếu theo biểu đồ tên.';
  }
  const themes = numbers.map((number) => `${number} (${MISSING_NUMBER_DATA[number].theme.toLocaleLowerCase('vi-VN')})`);
  return `Các bài học cần bồi đắp: ${themes.join(', ')}.`;
}

export function getHiddenPassionSummary(value: string | number): string {
  const numbers = extractMissingNumbers(value);
  if (numbers.length === 0) {
    return 'Chưa có đủ chữ cái hợp lệ để xác định Đam mê ẩn giấu.';
  }
  return `Năng lượng xuất hiện nhiều nhất: ${numbers
    .map((number) => `${number} (${NUMBER_THEMES[number]})`)
    .join(', ')}.`;
}

function buildKarmicDebtReading(value: string | number, cardNameVi: string): SpecialIndicatorReading {
  const debts = extractKarmicDebtCodes(value);
  if (debts.length === 0) {
    const reading = {
      overview: 'Kết quả hiện tại không ghi nhận bốn nợ nghiệp cốt lõi 13/4, 14/5, 16/7 hoặc 19/1 trong ngày sinh, tổng Đường đời hay tổng Sứ mệnh được kiểm tra.',
      strengths: ['Bạn có thể tập trung phát triển các chỉ số đang hiện diện thay vì tự gán cho mình một món nợ nghiệp không có trong hồ sơ.'],
      challenges: ['Không có nợ nghiệp không đồng nghĩa với không có thử thách; các bài học vẫn thể hiện qua số thiếu, thách thức và biểu đồ ngày sinh.'],
      advice: 'Đọc tiếp Bài học số thiếu và 4 Thách thức cuộc đời để nhận diện đúng vùng cần rèn luyện.',
    };
    return {
      title: `${cardNameVi}: Không ghi nhận nợ nghiệp`,
      ...reading,
      fullContent: toFullContent(reading),
    };
  }

  const reading = {
    overview: debts.map((debt) => KARMIC_DEBT_DATA[debt].overview).join(' '),
    strengths: debts.map((debt) => `${debt} · ${KARMIC_DEBT_DATA[debt].strength}`),
    challenges: debts.map((debt) => `${debt} · ${KARMIC_DEBT_DATA[debt].challenge}`),
    advice: debts.map((debt) => `${debt}: ${KARMIC_DEBT_DATA[debt].advice}`).join(' '),
  };
  return {
    title: `${cardNameVi}: ${debts.join(', ')}`,
    ...reading,
    fullContent: toFullContent(reading),
  };
}

function buildMissingNumbersReading(value: string | number, cardNameVi: string): SpecialIndicatorReading {
  const numbers = extractMissingNumbers(value);
  if (numbers.length === 0) {
    const reading = {
      overview: 'Biểu đồ tên hiện có đủ cả chín nhóm năng lượng từ 1 đến 9, nên không ghi nhận bài học số thiếu theo họ tên đang sử dụng.',
      strengths: ['Phổ năng lượng tên tương đối đầy đủ, tạo nhiều cách biểu đạt và thích nghi.'],
      challenges: ['Sự hiện diện đủ không cho biết mức độ cân bằng; số xuất hiện quá nhiều vẫn có thể tạo xu hướng cực đoan.'],
      advice: 'Xem Biểu đồ tên & tần suất để nhận diện số nổi trội và điều chỉnh cách biểu đạt cho cân bằng.',
    };
    return {
      title: `${cardNameVi}: Không có số thiếu`,
      ...reading,
      fullContent: toFullContent(reading),
    };
  }

  const reading = {
    overview: numbers.map((number) => MISSING_NUMBER_DATA[number].overview).join(' '),
    strengths: numbers.map((number) => `Số ${number} · ${MISSING_NUMBER_DATA[number].strength}`),
    challenges: numbers.map((number) => `Số ${number} · ${MISSING_NUMBER_DATA[number].challenge}`),
    advice: numbers.map((number) => `Số ${number}: ${MISSING_NUMBER_DATA[number].advice}`).join(' '),
  };
  return {
    title: `${cardNameVi}: ${numbers.join(', ')}`,
    ...reading,
    fullContent: toFullContent(reading),
  };
}

function buildHiddenPassionReading(value: string | number, cardNameVi: string): SpecialIndicatorReading {
  const numbers = extractMissingNumbers(value);
  if (numbers.length === 0) {
    const reading = {
      overview: 'Chưa có đủ chữ cái hợp lệ trong tên để xác định nhóm số xuất hiện nhiều nhất.',
      strengths: [],
      challenges: ['Kết quả này thường xuất hiện khi họ tên trống hoặc không có ký tự quy đổi được.'],
      advice: 'Kiểm tra lại họ tên đầy đủ trước khi đọc chỉ số Đam mê ẩn giấu.',
    };
    return { title: `${cardNameVi}: Chưa xác định`, ...reading, fullContent: toFullContent(reading) };
  }

  const reading = {
    overview: numbers.length === 1
      ? `Số ${numbers[0]} xuất hiện nhiều nhất trong tên, nhấn mạnh động lực ${NUMBER_THEMES[numbers[0]]}.`
      : `Các số ${numbers.join(', ')} cùng xuất hiện nhiều nhất trong tên. Hồ sơ này có nhiều nguồn động lực đồng hạng thay vì chỉ một Đam mê ẩn giấu.`,
    strengths: numbers.map((number) => `Số ${number} · Có thể phát huy ${NUMBER_THEMES[number]}.`),
    challenges: numbers.length > 1
      ? ['Nhiều động lực mạnh cùng lúc có thể làm phân tán ưu tiên nếu thiếu một mục tiêu chung.']
      : [`Năng lượng số ${numbers[0]} có thể bị dùng quá mức nếu không được cân bằng với các số còn lại.`],
    advice: numbers.length > 1
      ? 'Chọn một mục tiêu cho phép các nguồn động lực này hỗ trợ nhau thay vì cạnh tranh thời gian và sự chú ý.'
      : `Đưa chủ đề ${NUMBER_THEMES[numbers[0]]} vào một hoạt động đều đặn, có giới hạn rõ ràng.`,
  };
  return { title: `${cardNameVi}: ${numbers.join(', ')}`, ...reading, fullContent: toFullContent(reading) };
}

function buildBridgeReading(indicatorKey: string, value: string | number, cardNameVi: string): SpecialIndicatorReading {
  const distances = unique(extractSequence(value));
  const bridgeLabels: Record<string, string> = {
    bridgeLifeMission: 'Đường đời và Sứ mệnh',
    bridgeSoulPersonality: 'Linh hồn và Nhân cách',
    bridgeMaturityPassion: 'Trưởng thành và Đam mê',
  };
  const pair = bridgeLabels[indicatorKey];
  const values = distances.length > 0 ? distances : [0];
  const themes = values.map((distance) => NUMBER_THEMES[distance] || `bài học số ${distance}`);
  const aligned = values.length === 1 && values[0] === 0;
  const reading = {
    overview: aligned
      ? `${pair} có khoảng cách 0, cho thấy hai trường năng lượng đang vận hành khá đồng điệu.`
      : `${pair} có ${values.length > 1 ? 'các khoảng cách' : 'khoảng cách'} ${values.join(', ')}. Cầu nối này được phát triển qua ${themes.join(', ')}.`,
    strengths: aligned
      ? ['Sự thống nhất tự nhiên giúp giảm xung đột giữa hai mặt của chỉ số.']
      : values.map((distance) => `Số ${distance} · Khi làm chủ ${NUMBER_THEMES[distance] || `bài học số ${distance}`}, bạn có thể kết nối hai mặt tưởng như tách biệt.`),
    challenges: [aligned
      ? 'Sự thuận hòa sẵn có vẫn cần được sử dụng chủ động, tránh xem đó là điều hiển nhiên.'
      : `Khoảng cách ${values.join(', ')} có thể lộ rõ khi áp lực tăng hoặc khi một mặt bị ưu tiên quá mức.`],
    advice: aligned
      ? 'Duy trì sự nhất quán giữa ý định và hành động; dùng lợi thế này để hỗ trợ các chỉ số còn chênh lệch.'
      : `Rèn ${themes.join(', ')} bằng hành động cụ thể mỗi tuần và quan sát mức độ hài hòa giữa hai mặt.`,
  };
  return { title: `${cardNameVi}: ${values.join(', ')}`, ...reading, fullContent: toFullContent(reading) };
}

function buildFourStageReading(indicatorKey: 'way' | 'challenges', value: string | number, cardNameVi: string): SpecialIndicatorReading {
  const values = extractSequence(value).slice(0, 4);
  const isPinnacles = indicatorKey === 'way';
  const stageLabel = isPinnacles ? 'Đỉnh cao' : 'Thách thức';
  const stageLines = values.map((number, index) => `${stageLabel} ${index + 1}: số ${number} — ${NUMBER_THEMES[number] || `chủ đề số ${number}`}`);
  const reading = {
    overview: `Bốn giai đoạn của hồ sơ lần lượt là ${values.join(' → ')}. Mỗi vị trí là một chặng riêng, không phải chỉ đọc con số đầu tiên.`,
    strengths: stageLines,
    challenges: isPinnacles
      ? ['Mỗi đỉnh mở ra cơ hội khác nhau; bám vào năng lượng của chặng trước có thể làm chậm sự chuyển tiếp.']
      : ['Các thách thức lặp số cho thấy cùng một bài học có thể quay lại ở nhiều giai đoạn với mức độ trưởng thành khác nhau.'],
    advice: `Đọc lần lượt bốn vị trí theo tuổi hiện tại và tập trung vào chủ đề của ${stageLabel.toLocaleLowerCase('vi-VN')} đang diễn ra.`,
  };
  return { title: `${cardNameVi}: ${values.join(' - ')}`, ...reading, fullContent: toFullContent(reading) };
}

function buildEmptyNameComponentReading(
  indicatorKey: 'soul' | 'personality',
  cardNameVi: string
): SpecialIndicatorReading {
  const isSoul = indicatorKey === 'soul';
  const component = isSoul ? 'nguyên âm' : 'phụ âm';
  const reading = {
    overview: `Họ tên đã nhập không có ${component} được quy đổi, nên ${cardNameVi} chưa hình thành một giá trị số độc lập thay vì được gán sang nguyên mẫu số 9.`,
    strengths: [isSoul
      ? 'Động lực nội tâm có thể được nhận diện rõ hơn qua các chỉ số khác và qua cách bạn mô tả nhu cầu thật của mình.'
      : 'Cách bạn thể hiện ra ngoài có thể linh hoạt và cần được đọc cùng Sứ mệnh, Biểu đồ tên và bối cảnh giao tiếp.'],
    challenges: [`Thiếu dữ liệu ${component} khiến việc diễn giải riêng chỉ số này kém tin cậy nếu tên chưa được nhập đầy đủ.`],
    advice: 'Kiểm tra lại họ tên khai sinh hoặc tên đang sử dụng; không tự quy số 0 thành một nguyên mẫu 1–9.',
  };
  return { title: `${cardNameVi}: Chưa hình thành`, ...reading, fullContent: toFullContent(reading) };
}

export function getSpecialIndicatorReading(
  indicatorKey: string,
  value: string | number,
  cardNameVi: string
): SpecialIndicatorReading | null {
  if ((indicatorKey === 'soul' || indicatorKey === 'personality') && Number(value) === 0) {
    return buildEmptyNameComponentReading(indicatorKey, cardNameVi);
  }
  if (indicatorKey === 'karmicDebts') return buildKarmicDebtReading(value, cardNameVi);
  if (indicatorKey === 'missingNumbers') return buildMissingNumbersReading(value, cardNameVi);
  if (indicatorKey === 'passion') return buildHiddenPassionReading(value, cardNameVi);
  if (indicatorKey.startsWith('bridge')) return buildBridgeReading(indicatorKey, value, cardNameVi);
  if (indicatorKey === 'way' || indicatorKey === 'challenges') {
    return buildFourStageReading(indicatorKey, value, cardNameVi);
  }
  return null;
}
