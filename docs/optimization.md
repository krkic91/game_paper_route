<!-- version v1.0 -->
# Tối ưu thư viện và Neon Survivors

Phạm vi đã thống nhất ngày 24/10/2026:

1. Tải JavaScript/CSS theo game được chọn, giữ HTTP và mở trực tiếp `file://`.
2. Lưu vàng, nâng cấp, nhân vật và tùy chọn Neon trên thiết bị.
3. Giảm việc vẽ ngoài màn hình và tạo lại hiệu ứng phát sáng; thêm chất lượng đồ họa.
4. Giảm số phép kiểm tra va chạm và số lần ghi lại HUD.
5. Mô phỏng theo bước thời gian cố định, giới hạn bù thời gian và giảm vẽ màn tĩnh.
6. Cho phép cache có kiểm tra phiên bản trong chế độ máy chủ production.

Không thay đổi số quái, luật chơi hay độ khó để đạt kết quả hiệu năng.

## Cách đánh giá

- Lưu bản HTML/JavaScript ban đầu ở `test-results/optimization/` trước khi sửa.
- `tests/benchmark-optimization.cjs before|after` đo thư viện trong ba browser
  context mới, dùng server HTTP cục bộ với cache tắt cho cả hai bản.
- Cảnh Neon dùng cùng seed, 220 quái, 100 viên đạn, 300 ngọc và 100 đồng vàng;
  viewport 820×1180, DPR 2. Tắt âm thanh và tạo trạng thái trực tiếp trong test.
- Đo thời gian CPU cập nhật; đo vẽ Canvas kèm đọc một pixel để buộc hoàn thành
  tác vụ vẽ. Chi phí đọc pixel có trong kết quả, không quy đổi thành FPS chơi thật.
- Đếm thay đổi DOM khi HUD không đổi và số lần vẽ lại màn tạm dừng.
- Thời gian mở Neon qua automation có cả chi phí thao tác/chờ của Playwright.
  Bộ nhớ `performance.memory` chỉ ghi khi trình duyệt cung cấp; không phải toàn
  bộ bộ nhớ GPU hoặc tiến trình.

Chromium/Edge và WebKit chạy headless trên Windows với kích thước mô phỏng.
Không tạo máy ảo, không có phép đo pin/nhiệt độ hoặc kiểm thử trên iPad thật.
Số đo tổng hợp chỉ dùng so sánh cùng điều kiện; cần kiểm thử thiết bị thật để
kết luận độ mượt khi chơi dài trên từng dòng iPhone/iPad.

## Chạy benchmark

Đặt `PLAYWRIGHT_MODULE` và `PLAYWRIGHT_BROWSERS_PATH` như README nếu Playwright
cài riêng. Benchmark tự mở/đóng server loopback trên cổng trống.

```powershell
node tests/benchmark-optimization.cjs before
node tests/benchmark-optimization.cjs after
```

Lệnh `before` cần các snapshot `index-before.html`, `arcade-before.js`,
`art-before.js`, `royal-before.js`, `neon-before.html` trong
`test-results/optimization/`. Thư mục này không đưa
vào git. Lệnh `after` dùng mã nguồn hiện tại. Báo cáo JSON nằm cùng thư mục.

## Kết quả

Kết quả và các lệnh kiểm thử chức năng sẽ được ghi sau khi hoàn tất đối chiếu.
