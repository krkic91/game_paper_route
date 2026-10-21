<!-- version v1.0 -->
# Nối thú

Game giải đố một người, 24 cấp, nằm trong nhóm **Trí tuệ**. Không cần tài khoản, mạng hay tải ảnh ngoài. Hình thú dùng emoji có tên tiếng Việt đi kèm cho trình đọc màn hình.

## Luật và điều khiển

- Chọn hai thú giống nhau. Đường nối đi ngang/dọc, tối đa hai lần rẽ; không xuyên qua ô có thú. Viền trống ngoài bàn cũng là đường đi hợp lệ.
- Ghép hết các cặp trước khi hết giờ để thắng. Bấm lại ô đang chọn để bỏ chọn. Chọn một ô khác không nối được sẽ chuyển lựa chọn sang ô đó.
- Từ cấp 5 có thú đóng băng: ghép đủ 3 cặp để mở; từ cấp 17 cần 5 cặp. Chọn ô băng sẽ hiện số cặp còn cần, không làm mất lượt.
- Gợi ý tô sáng một cặp và vẽ đường nối; người chơi tự chọn hai ô để ghép. Có 3 gợi ý ở cấp 1–12, 2 ở cấp 13–24. Xáo trộn có 2 lượt ở cấp 1–16, 1 ở cấp 17–24.
- Nếu không còn cặp nối được, bàn tự sắp lại miễn phí, giữ nguyên số thú, thời gian, gợi ý và lượt xáo. Ô băng được phân bố lại để luôn có đủ cặp tự do mở khóa. Game thông báo rõ lần cứu bàn này.
- Tab tới ô rồi Enter/Space để chọn; phím mũi tên chuyển tiêu điểm. Trên màn hình hẹp có thể kéo ngang riêng bàn. Nút ngoài bàn tối thiểu 42 px, ô thú tối thiểu 34 px.
- Tạm dừng và chuyển ứng dụng dừng đồng hồ. Hoạt ảnh nối cặp 0,3 giây không trừ giờ. Chơi lại, đổi cấp và đóng game hủy toàn bộ callback cũ.

## Các cấp độ và cách sinh bàn

| Cấp | Bàn | Loại thú | Thời gian |
| --- | --- | --- | --- |
| 1–8 | 6×6 | 4–7 | 180 xuống 131 giây |
| 9–16 | 6×8 | 8–11 | 210 xuống 161 giây |
| 17–24 | 8×8 | 12 | 240 xuống 191 giây |

Mỗi nhóm dùng bốn hình bố trí: kín, trống bốn góc, trống 2×2 giữa bàn, hoặc cả hai. Ô trống giảm bớt số cặp nhưng tạo đường vòng khác nhau. Số ô băng tăng từ 4 đến 12. Độ khó thay đổi theo tổ hợp mật độ, loại thú, thời gian, công cụ và băng; không cam kết từng cấp luôn khó hơn cấp trước với mọi người.

Mỗi ván sử dụng xáo ngẫu nhiên mới, không chỉ xoay một mẫu cố định. Bộ sinh trước tiên đặt các vị trí có thú, rồi lần lượt chọn một cặp vị trí có đường nối hợp lệ và tạm gỡ chúng. Sau khi gỡ hết, bộ sinh gán cùng loài cho từng cặp trong thứ tự đó. Kết quả có một thứ tự gỡ hoàn chỉnh chứng minh bàn giải được. Các cặp đầu cần để mở băng luôn không bị khóa.

Tìm cặp hình học thử ngẫu nhiên hữu hạn rồi dùng hai ô ngoài cùng bên phải của hai hàng (hoặc hai ô liền nhau còn lại trên một hàng), nên không cần tìm kiếm vét cạn hay vòng lặp thử lại vô hạn. Khi người chơi ghép theo thứ tự khác làm bàn kẹt, cơ chế cứu bàn dựng lại từ đúng các cặp còn lại.

Chọn cấp bất kỳ để luyện tập. Thắng có nút lên cấp tiếp theo và chơi lại; cấp 24 là cấp cuối. Điểm thắng = cấp × 100 + số giây còn lại làm tròn lên × 5. Nếu hết giờ, mỗi cặp đã nối được 10 điểm.

## Tệp và API

- `games/onet-logic.js`: CommonJS/UMD `ArcadeOnet`, không phụ thuộc DOM.
- `games/onet.js`, `games/onet.css`: giao diện `ArcadeGames.onet`, vòng đời dùng `ArcadeShared`.
- `createGame({level, random})`: trạng thái có `rows`, `cols`, `board`, `locks`, `matched`, `remaining`, `time`, `hints`, `shuffles`, `rescues`, `phase` và `solution`.
- `board` là mảng gồm một vòng viền trống: chỉ số ô = hàng × (cột + 2) + cột, với hàng/cột chơi bắt đầu từ 1. Giá trị 0 trống, 1–12 là loại thú. `locks[index] > matched` nghĩa là ô còn đóng băng.
- `findPath(state,a,b)` trả danh sách 2–4 điểm gấp khúc hoặc `null`; `findMatches(state,limit)` trả các cặp hợp lệ.
- `match`, `hint`, `shuffle` trả `{ok,...}` và sửa trạng thái; `tick(state,seconds)` giảm giờ khi đang chơi; `rescue` chỉ sắp lại nếu không còn cặp. `phase` là `play`, `won` hoặc `lost`.
- Selector kiểm thử: `[data-onet-cell="index"]`, `[data-onet-hint]`, `[data-onet-shuffle]`, `[data-onet-level]`, `[data-onet-next]`.

## Kiểm thử

`node --test tests/onet.test.cjs` kiểm thử đường nối bằng bộ BFS độc lập trên 1.500 bàn ngẫu nhiên; kiểm tra đường thẳng/gấp khúc/viền/ô bị chặn; 288 bàn có thứ tự giải chứng minh và 288 ván theo lựa chọn ngẫu nhiên; bảo toàn cặp, băng, cứu bàn, giới hạn công cụ, thắng và hết giờ.

`node tests/browser-onet.cjs` dùng bộ chạy `browser-expansion-kit.cjs`: Chromium và WebKit, mỗi engine một kịch bản chức năng và bốn kích thước 320×740, 390×844, 820×1180, 1366×900. Bao gồm ghép cặp, bàn phím, đóng băng, gợi ý, xáo, cứu bàn, thắng, cấp tiếp, thua, chơi lại khi hoạt ảnh đang chạy, tạm dừng, đóng game và thao tác cảm ứng mô phỏng. Đây là trình duyệt headless trên Windows, không phải thiết bị iOS thật hoặc máy ảo iOS. Kết quả chạy thực tế nằm trong `test-results/expansion-onet/results.json`.

Kết quả ngày 21/10/2026: **10/10 unit tests** và **10/10 browser cases** đạt; Chromium/Edge 155.0.4283.62, WebKit 26.0. Kiểm tra cú pháp ba tệp JavaScript chạy trực tiếp và `git diff --check` đạt. Đã xem ảnh giao diện 320 px trên Chromium và 390 px trên WebKit. Bài kiểm thử chờ hoạt ảnh kết thúc theo trạng thái thực tế, không giả định thời gian render giống nhau giữa hai engine.
