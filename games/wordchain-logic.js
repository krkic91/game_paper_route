(function (root, factory) {
  'use strict'; const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api; else root.ArcadeWordchain = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const normalize = text => String(text).normalize('NFC').toLocaleLowerCase('vi-VN').trim().replace(/\s+/g, ' ');
  // A deliberately bounded, editable family vocabulary, authored for this game.
  const WORDS = [...new Set(`
    học sinh|sinh nhật|nhật ký|ký tên|tên gọi|gọi điện|điện thoại|thoại kịch|kịch bản|bản đồ|đồ chơi|chơi đùa|đùa vui|vui vẻ|vẻ đẹp|đẹp đẽ
    học tập|tập thể|thể thao|thao tác|tác phẩm|phẩm chất|chất lượng|lượng mưa|mưa rào|rào chắn|chắn gió|gió mùa|mùa hè|hè phố|phố cổ|cổ tích|tích cực|cực kỳ|kỳ nghỉ|nghỉ ngơi
    học đường|đường phố|phố phường|phường xã|xã hội|hội họa|họa sĩ|sĩ số|số học|học hỏi|hỏi han
    học trò|trò chơi|chơi bóng|bóng đá|đá bóng|bóng rổ|rổ rá|bóng chuyền|chuyền tay|tay chân|chân thành|thành phố|phố xá|xá lợi|lợi ích|ích kỷ
    con người|người thân|thân thiện|thiện chí|chí hướng|hướng dẫn|dẫn đường|đường đi|đi bộ|bộ đội|đội hình|hình ảnh|ảnh hưởng|hưởng thụ
    con cá|cá chép|chép bài|bài học|học phí|phí phạm|phạm vi|vi tính|tính toán|toán học|học sinh
    con chim|chim sẻ|sẻ chia|chia tay|tay áo|áo dài|dài lâu|lâu đài|đài phát|phát thanh|thanh bình|bình minh|minh họa|họa tiết|tiết học
    con ong|ong mật|mật ong|mật khẩu|khẩu trang|trang phục|phục vụ|vụ mùa|mùa xuân|xuân xanh|xanh lá|lá cây|cây xanh|xanh tươi|tươi sáng|sáng tạo|tạo hình
    con đường|đường ray|ray tàu|tàu hỏa|hỏa lực|lực sĩ|sĩ diện|diện tích|tích lũy|lũy tre|tre xanh
    con mèo|mèo con|con chó|chó con|con trâu|trâu bò|bò sữa|sữa chua|chua cay|cay đắng|đắng ngắt
    gia đình|đình làng|làng quê|quê hương|hương thơm|thơm ngon|ngon lành|lành mạnh|mạnh khỏe|khỏe khoắn
    gia vị|vị giác|giác quan|quan tâm|tâm hồn|hồn nhiên|nhiên liệu|liệu pháp|pháp luật|luật chơi|chơi chữ|chữ viết|viết tay
    gia tài|tài năng|năng lượng|lượng giác|giác ngộ|ngộ nghĩnh
    nhà cửa|cửa sổ|sổ tay|tay nghề|nghề nghiệp|nghiệp dư|dư dả
    nhà trường|trường học|học kỳ|kỳ diệu|diệu kỳ|kỳ quan|quan sát|sát cánh|cánh đồng|đồng quê|quê nhà|nhà bếp|bếp lửa|lửa trại|trại hè
    nhà văn|văn học|học thức|thức ăn|ăn uống|uống nước|nước mưa|mưa phùn|phùn phùn
    nhà thơ|thơ ca|ca hát|hát ru|ru ngủ|ngủ ngon|ngon miệng|miệng cười|cười vui|vui chơi
    nhà sách|sách vở|vở kịch|kịch nói|nói chuyện|chuyện trò|trò chuyện|chuyện kể|kể chuyện
    nhà máy|máy bay|bay bổng|bổng lộc|lộc non|non nớt
    mặt trời|trời xanh|xanh biếc|biếc xanh|mặt đất|đất nước|nước biển|biển cả|cả nhà|nhà vườn|vườn hoa|hoa quả|quả cam|cam kết|kết quả
    hoa hồng|hồng hào|hào hứng|hứng thú|thú vị|vị trí|trí nhớ|nhớ nhung|nhung lụa|lụa là
    hoa sen|sen đá|đá quý|quý giá|giá trị|trị liệu|liệu trình|trình bày|bày biện|biện pháp
    hoa mai|mai vàng|vàng bạc|bạc hà|hà mã|mã số|số lượng|lượng từ|từ điển|điển hình|hình học
    cây cối|cối xay|xay xát|cây bút|bút chì|chì màu|màu sắc|sắc màu|màu xanh|xanh ngát
    cây cầu|cầu vồng|vồng lên|cầu thủ|thủ môn|môn học|học giỏi|giỏi giang|giang sơn|sơn hà
    cây đàn|đàn hát|hát hò|hò reo|reo vui|vui mừng|mừng tuổi|tuổi thơ|thơ mộng|mộng mơ|mơ ước|ước mơ
    âm nhạc|nhạc cụ|cụ thể|thể hiện|hiện tại|tại sao|sao trời|trời mưa|mưa gió|gió biển|biển xanh
    âm thanh|thanh niên|niên học|học hành|hành động|động vật|vật lý|lý do|do dự|dự định|định hướng|hướng đi
    thời gian|gian hàng|hàng hóa|hóa học|học viện|viện trợ|trợ giúp|giúp đỡ
    thời tiết|tiết kiệm|kiệm lời|lời nói|nói cười|cười đùa|đùa giỡn
    thời khóa|khóa học|học bổng|bổng lộc|thời trang|trang trí|trí tuệ|tuệ giác
    bình yên|yên bình|bình tĩnh|tĩnh lặng|lặng lẽ|lẽ phải|phải chăng|chăng dây|dây đàn|đàn cá|cá rô
    bình thường|thường ngày|ngày mai|mai sau|sau cùng|cùng nhau|nhau thai
    bạn bè|bè bạn|bạn học|học việc|việc làm|làm việc|việc nhà|nhà ở
    tình bạn|bạn đọc|đọc sách|sách giáo|giáo viên|viên chức|chức năng|năng động|động cơ|cơ hội|hội thi|thi đua|đua xe|xe đạp|đạp xe
    tình yêu|yêu thương|thương nhớ|nhớ nhà|nhà ga|ga tàu|tàu biển|biển báo|báo chí|chí khí|khí hậu|hậu phương|phương hướng
    tình cảm|cảm giác|giác quan|quan hệ|hệ thống|thống nhất|nhất trí|trí thức|thức giấc|giấc mơ
    đoàn kết|kết nối|nối tiếp|tiếp sức|sức khỏe|khỏe mạnh|mạnh mẽ
    đoàn tàu|tàu điện|điện lực|lực lượng|lượng sức|sức sống|sống động|động viên|viên mãn
    công viên|viên bi|bi ve|ve sầu|sầu riêng|riêng biệt|biệt danh|danh sách|sách hay|hay ho
    công nghệ|nghệ thuật|thuật ngữ|ngữ văn|văn hóa|hóa đơn|đơn giản|giản dị
    công việc|việc tốt|tốt bụng|bụng dạ|dạ hội|hội trường|trường đua
    mùa thu|thu hoạch|hoạch định|định nghĩa|nghĩa tình|tình thân|thân yêu|yêu quý|quý mến
    mùa đông|đông đúc|đúc kết|kết hợp|hợp tác|tác giả|giả thuyết|thuyết trình
    cánh cửa|cửa hàng|hàng xóm|xóm làng|làng nghề|nghề giáo|giáo dục|dục vọng
    cánh chim|chim non|non xanh|xanh rờn|cánh buồm|buồm căng|căng thẳng|thẳng thắn
    bánh mì|mì sợi|sợi chỉ|chỉ dẫn|dẫn dắt|dắt tay|tay lái|lái xe|xe buýt
    bánh chưng|chưng cất|cất cánh|cánh hoa|hoa lá|lá thư|thư viện|viện bảo|bảo tàng|tàng hình
    bầu trời|trời tối|tối qua|qua lại|lại gần|gần gũi|gũi gần
    bầu bạn|bạn thân|thân thiết|thiết kế|kế hoạch|hoạch toán
  `.split(/[|\n]/).map(normalize).filter(Boolean))];
  // Remove fragments that only served as bridges while drafting the vocabulary.
  const excluded = new Set(['đài phát', 'ray tàu', 'phùn phùn', 'biếc xanh', 'vồng lên', 'sách giáo', 'viện bảo', 'gũi gần', 'hoạch toán']);
  const dictionary = WORDS.filter(w => !excluded.has(w));
  const first = w => w.split(' ')[0], last = w => w.split(' ').at(-1);
  const candidates = s => dictionary.filter(w => first(w) === last(s.word) && !s.used.includes(w));
  function createGame(rng = Math.random) {
    const starts = ['học sinh', 'con đường', 'gia đình', 'nhà trường', 'hoa hồng', 'cây đàn', 'âm nhạc', 'thời gian', 'tình bạn', 'công viên'];
    const word = starts[Math.min(starts.length - 1, Math.floor(rng() * starts.length))];
    return { word, used: [word], history: [{ word, who: 'Máy' }], seconds: 90, score: 0, turns: 0, hints: 3, phase: 'play', reason: '' };
  }
  function submit(s, input, rng = Math.random) {
    if (s.phase !== 'play') return { ok: false, error: 'Ván đã kết thúc.' };
    const word = normalize(input);
    if (!dictionary.includes(word)) return { ok: false, error: 'Từ này chưa có trong từ điển của bàn. Thử một từ khác hoặc dùng Gợi ý.' };
    if (first(word) !== last(s.word)) return { ok: false, error: `Từ cần bắt đầu bằng “${last(s.word)}”.` };
    if (s.used.includes(word)) return { ok: false, error: 'Từ này đã được dùng trong ván.' };
    s.used.push(word); s.history.push({ word, who: 'Bạn' }); s.word = word; s.score += 10; s.turns++;
    const replies = candidates(s);
    if (!replies.length) { s.phase = 'finished'; s.reason = 'Máy hết từ. Bạn thắng!'; s.score += 50; return { ok: true }; }
    const friendly = replies.filter(w => candidates({ word: w, used: [...s.used, w] }).length);
    const pool = friendly.length ? friendly : replies;
    const reply = pool[Math.min(pool.length - 1, Math.floor(rng() * pool.length))];
    s.word = reply; s.used.push(reply); s.history.push({ word: reply, who: 'Máy' });
    if (!candidates(s).length) { s.phase = 'finished'; s.reason = 'Bạn đã đi hết nhánh từ này. Thử một chuỗi mới nhé!'; }
    return { ok: true, reply };
  }
  function hint(s) {
    if (s.phase !== 'play' || !s.hints) return null;
    const word = candidates(s)[0]; if (!word) return null;
    s.hints--; s.score = Math.max(0, s.score - 5); return word;
  }
  function tick(s, dt) {
    if (s.phase !== 'play' || !Number.isFinite(dt) || dt < 0) return;
    s.seconds = Math.max(0, s.seconds - dt);
    if (!s.seconds) { s.phase = 'finished'; s.reason = 'Hết 90 giây. Bạn đã nối được ' + s.turns + ' từ!'; }
  }
  return { WORDS: dictionary, normalize, first, last, candidates, createGame, submit, hint, tick };
});
