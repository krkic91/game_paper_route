<!-- version v1.0 -->
# Dò mìn

Mở tất cả ô không có mìn để thắng. Mỗi số đếm mìn trong tối đa tám ô xung quanh. Cờ chỉ là ghi chú của người chơi; cờ sai không được tự sửa. Mở nhanh một ô số khi đủ cờ xung quanh sẽ mở các ô còn lại, và có thể thua nếu cờ sai.

| Độ khó | Kích thước | Mìn |
| --- | --- | --- |
| Dễ | 8 × 8 | 10 |
| Vừa | 10 × 10 | 18 |
| Khó | 12 × 12 | 30 |

Điện thoại dùng hai nút **Mở ô / Cắm cờ**. Chuột phải cắm hoặc bỏ cờ. Phím mũi tên chuyển ô; Enter/Space thao tác; F cắm/bỏ cờ. Bàn lớn cuộn ngang riêng, ô chạm 40–44 px. Thời gian chỉ chạy sau lần mở đầu tiên, dừng khi tạm dừng, ẩn trang hoặc kết thúc. Đổi độ khó/chế độ ngày bắt đầu ván mới.

## Bàn không cần đoán

Không đặt mìn trong ô đầu tiên và tám ô xung quanh. Mỗi ứng viên được kiểm tra bằng bộ giải gồm ràng buộc số lân cận, tổng mìn còn lại và hiệu hai tập ô khi một tập là tập con của tập kia. Hàm `deduce` chỉ nhận số đã mở và cờ, tuyệt đối không nhận vị trí mìn hoặc số của ô chưa mở. Hàm `solve` mô phỏng mở ô, kiểm tra từng suy luận, và chỉ chấp nhận bàn khi mở hết ô an toàn.

Giới hạn 60 ứng viên. UI thử từng ứng viên ở các khung hình khác nhau, cho phép tạm dừng/đóng/chơi lại giữa các lượt kiểm tra. Nếu hết giới hạn, bộ sinh dùng một dải mìn ở cạnh xa ô đầu tiên; bố cục dự phòng vẫn phải qua cùng bộ giải, có thể dễ hơn và được ghi rõ trên giao diện. Không có tuyên bố mức độ khó đồng đều giữa mọi bố cục.

Thử thách ngày dùng ngày địa phương `YYYY-MM-DD`, độ khó và phiên bản thuật toán làm seed; tự mở ô trung tâm cố định. Chơi lại trong cùng ngày/độ khó giữ nguyên bàn. Không có bảng xếp hạng máy chủ hay kiểm soát thời gian hệ thống. Ván thường dùng seed mới.

Điểm khi thắng: `max(100, 2000 - 3 × số giây nguyên) × hệ số độ khó (1/2/3)`. Điểm lưu qua callback chung của thư viện. Thua nhận 0 điểm.

## Mã và kiểm thử

- `games/minesweeper-logic.js`: UMD `ArcadeMinesweeper`, không phụ thuộc DOM.
- `games/minesweeper.js`: `ArcadeGames.minesweeper`, vòng đời `ArcadeShared.createScope`.
- `games/minesweeper.css`: toàn bộ selector giới hạn vào game.
- Chạy luật: `node --test tests/minesweeper.test.cjs`.
- Chạy giao diện: khởi động `node scripts/serve.js 4185`, đặt `TEST_URL=http://127.0.0.1:4185`, rồi `node tests/browser-minesweeper.cjs`. Có thể đặt `PLAYWRIGHT_MODULE` và `PLAYWRIGHT_BROWSERS_PATH` tới bộ Playwright/browser đã cài.

Bộ luật kiểm tra 300 bàn có seed bằng thao tác thật dựa trên dữ kiện nhìn thấy; 308 ô xuất phát trong bố cục dự phòng; 512 cấu hình 3×3 để kiểm tra tính đúng của suy luận; cờ, mở vùng trống, mở nhanh đúng/sai, thua/thắng, seed ngày và điểm. Bộ browser dùng Chromium/WebKit với kích thước 320×740, 390×844, 820×1180 và 1366×900; có ván thắng bằng suy luận qua UI, ván thua, phím tắt, chế độ ngày, tạm dừng và đóng game. Đây là mô phỏng trình duyệt trên Windows, không phải iPhone/iPad thật hoặc máy ảo iOS. Kết quả thực thi browser được ghi riêng dưới `test-results/expansion-minesweeper/results.json`.

Kết quả chạy ngày 21/10/2026: **13/13 kiểm thử luật và 10/10 lượt browser đạt**, gồm Chromium 155.0.4283.62 và WebKit 26.0; mỗi engine chạy một kịch bản chức năng đầy đủ và bốn kích thước nêu trên. Kiểm tra đồng hồ sau khi tiếp tục chờ điều kiện thời gian tăng, tối đa 5 giây, thay cho giả định khung hình phải xuất hiện trong 150 ms. Kiểm tra thời gian đứng yên khi tạm dừng và trạng thái ngừng cập nhật sau khi đóng vẫn được giữ nguyên.
