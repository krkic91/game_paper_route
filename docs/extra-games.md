# Bốn game bổ sung

Thư viện hiện có 41 game. Các game dưới đây dùng tài nguyên trong dự án, tải khi mở, hỗ trợ trực tiếp `index.html` qua `file://` và giao diện chạm trên điện thoại.

## Đuổi hình bắt chữ — `riddles`

150 câu tự biên soạn trong `games/riddles-data.js`: 50 thiên nhiên, 50 đời sống, 50 từ ghép/thành ngữ. Dùng pictogram emoji cục bộ; hình có thể khác nhẹ giữa thiết bị. Ghép tên/âm/ý nghĩa của hình; mỗi câu có gợi ý và giải thích sau khi trả lời. Có thể nhập không dấu; chuẩn hóa dấu, chữ hoa, khoảng trắng và dấu câu.

Mỗi phiên 10 câu, ưu tiên câu chưa giải. Đúng được 100 trừ 10 mỗi lần sai và 20 mỗi gợi ý, tối thiểu 10. Hai gợi ý mỗi câu; Xem đáp án được 0. Không giới hạn thời gian. Lưu danh sách ID câu đã giải trên trình duyệt, không gửi dữ liệu đi. Kho câu là hữu hạn; khi đã giải hết sẽ gặp lại câu cũ.

## Tô màu — `coloring`

Sáu tranh SVG nguyên bản: vườn hoa, biển, nhà, bướm, hoa tròn và tàu vũ trụ. Mỗi tranh có 18–34 vùng tô. Chọn 16 màu sẵn hoặc màu tùy ý, chạm từng vùng. Tẩy, hoàn tác và làm lại tối đa 100 bước; dùng được Tab/Enter/Space. Không giới hạn thời gian hoặc áp đặt bảng màu.

Lưu từng tranh trong localStorage; nếu lưu bị chặn, giao diện báo rõ và vẫn cho chơi. Nút Xóa màu có thể hoàn tác, Chơi lại đặt lại tranh hiện tại. Tô đủ vùng được 100 điểm; có thể tiếp tục sửa màu. Tải PNG 1200 × 1200 qua canvas cục bộ, không dùng dịch vụ ngoài.

## Sâm lốc — `samloc`

Bạn và ba máy, 10 lá/người, 12 lá dư không dùng. So số, không so chất. Lẻ/đôi/sám/tứ quý theo 3…K,A,2. Sảnh từ ba lá; A23 thấp nhất, 234 tiếp theo, QKA cao nhất; không KA2. Tứ quý chặt một lá 2 hoặc tứ quý nhỏ hơn, không đôi thông.

Ván đầu người có số nhỏ nhất đi trước, hòa ưu tiên ghế Bạn→Máy 3. Ván sau người thắng đi trước. Ăn trắng ưu tiên sảnh 10 lá, tứ quý 2, cùng màu, ba sám, năm đôi; cùng loại ưu tiên ghế. Báo sâm theo lượt ghế, người báo đầu tiên có quyền đi trước. Phải đợi đối thủ bỏ lượt cả bộ cuối; bị chặn bất kỳ lần nào thì người chặn thắng ván.

Bỏ lượt đợi vòng mới. Còn một lá tự báo; người ngay trước chọn đánh lẻ phải dùng lá cao nhất. Về bằng bộ 2 riêng là thua thối 2; sảnh chứa 2 được về. Không cược, không phạt cóng/đền cửa. Thắng thường 100, báo sâm thành công 200 điểm. AI chỉ dùng bài của mình, bộ công khai và số lá còn lại.

Tham khảo quy tắc: [Sảnh Rồng — Luật Sâm lốc](https://sanhrong.info/game-sam-loc/luat-choi). Các cách ưu tiên ghế, kết thúc thua thối 2 và điểm thưởng nêu trên là quy ước cụ thể của bàn này.

## Mậu binh — `maubinh`

Chia hết 52 lá cho bốn người; mỗi người xếp chi trên 3, giữa 5, dưới 5. Chi dưới ≥ giữa ≥ trên. Binh lủng bị chặn trước khi gửi, cho sửa tự do. Chọn lá rồi ô trống để xếp; chọn hai lá để đổi vị trí, có gợi ý và hoàn tác. Không giới hạn thời gian.

Thứ hạng: mậu thầu, đôi, thú, sám, sảnh, thùng, cù lũ, tứ quý, thùng phá sảnh. Chi 3 lá chỉ xét mậu thầu/đôi/sám. Không so chất; so nhóm chính rồi các lá lẻ giảm dần. Bàn dùng A2345 thấp nhất, không sảnh vòng QKA23. Khi so chi 3 với chi 5 để kiểm tra lủng, phần thiếu ở cuối khóa so sánh tính bằng 0.

So sáu cặp người chơi: mỗi chi thắng +1, thua −1, bằng 0; thắng đủ ba chi cùng một người là +6/−6. Tổng điểm các ghế bằng 0. Người có tổng chi cao nhất đứng đầu (có thể đồng hạng), được 100 điểm game. Không xét tới trắng hoặc thưởng bộ đặc biệt. Bài đối thủ giữ riêng trong WeakMap đến khi gửi bài. Gợi ý/AI xét mọi cách chia hợp lệ và chọn theo điểm mạnh của ba chi, chỉ dựa trên bài của chính ghế đó.

Cấu trúc chi tham khảo [hướng dẫn Mậu binh](https://gamevh.net/cms/static/guide_maubinh.jsp); quy tắc sảnh nhỏ, không thưởng bộ và sập ba chi là biến thể gia đình được ghi rõ trên giao diện.

## Kiểm thử

- `npm run test:extras`: bộ 52 lá, luật Sâm, báo sâm, ván hoàn chỉnh, bí mật bài, đánh giá và chia chi Mậu binh, kho 150 câu, điểm/gợi ý và lưu/hoàn tác tô màu.
- `npm run test:extras:browser`: Playwright/Edge, mở file trực tiếp ở 1366/390/320 px; thao tác chuột/chạm/bàn phím, lưu mở lại, PNG, kết quả ván, tạm dừng/chơi lại/thoát, lỗi trình duyệt và tràn ngang.
- `npm run check` và `npm test`: cú pháp và hồi quy toàn dự án.

Ảnh và báo cáo ở `test-results/extras/` (không đưa vào Git). Màn hình điện thoại được mô phỏng, chưa thay thế thử nghiệm trên thiết bị thật.

Kết quả ngày 28/10/2026: `npm test` qua **405/405**, gồm 22 kiểm thử mới; kiểm tra cú pháp và `git diff --check` qua. Edge qua **12 kịch bản chơi** (bốn game × ba kích thước), kiểm tra lưu trữ bị chặn và xuất PNG 1200 × 1200. Bộ kiểm tra tải thư viện mở đủ **41 game qua file://**. Không mở server phục vụ game trong đợt kiểm tra này; cổng 4173 vẫn tắt.
