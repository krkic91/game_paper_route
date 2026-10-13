<!-- version v1.0 -->
# Đua xe đạp — bản nâng cấp chuyển động

Cuộc đua 1 km với ba đối thủ máy, có cả 2D và 3D. Hai bản dùng chung mô phỏng;
đổi bản bắt đầu ván mới. Đây là mô phỏng đơn giản dành cho game giải trí.

## Điều khiển

| Thao tác | Bàn phím | Điện thoại / máy tính bảng |
| --- | --- | --- |
| Lái trái / phải | A / D hoặc ← / → | Giữ nút mũi tên |
| Nước rút | Space, W, ↑ hoặc Shift | Giữ Nước rút |
| Phanh | S hoặc ↓ | Giữ Phanh |
| Thả trôi | C | Giữ Thả trôi |
| Tạm dừng | P | Nút tạm dừng trên thanh tiêu đề |

Xe tự đạp đều khi không giữ phanh hoặc thả trôi. Phanh ưu tiên hơn tăng tốc.
Có thể giữ lái và nước rút bằng hai ngón tay. Thả trôi vẫn giữ quán tính; khi
xuống dốc xe có thể tăng tốc dù không đạp.

Núp gió phía sau đối thủ ở khoảng cách 2,2–14 m giúp giảm lực cản và giữ sức.
Lên dốc, đường sỏi và lề cỏ làm xe chậm hơn; đường ướt giảm độ bám khi lái/phanh.
Chạm cọc làm mất một điểm chịu va chạm; vũng nước giảm tốc và làm trơn lốp tạm
thời; chạm tay đua làm hai xe chao và mất tốc độ. Nhặt nước hồi năng lượng.

Âm thanh gió, lốp, truyền động và va chạm được tạo cục bộ bằng Web Audio, chỉ
khởi tạo sau thao tác người dùng. Âm thanh dừng khi tạm dừng, kết thúc hoặc đóng
game. Nút Âm thanh và Giảm rung lưu tùy chọn trên thiết bị. Giảm rung mặc định
theo thiết lập giảm chuyển động của hệ điều hành khi chưa có tùy chọn đã lưu.

## Mô phỏng và hình ảnh

- `games/race-logic.js`: luật và vật lý độc lập DOM; bước cố định 1/120 giây,
  tích lũy thời gian giữa các frame. Quán tính lái, lực đạp, lực cản, dốc, phanh,
  độ bám và thể lực cùng quyết định tốc độ. Đối thủ cũng chịu các lực và va chạm,
  chọn đường né/vượt, bám đoàn khi mệt và nước rút cuối chặng.
- `trackAt(distance, trackSeed)` trả về tim đường, cao độ, hướng, độ cong, độ
  dốc, mặt đường và bề rộng 6,9 m. Hai renderer dùng cùng dữ liệu này. Tọa độ
  ngang quy đổi thành mét bằng `(x - 1.5) * 2.5`; lề cỏ bắt đầu ngay ngoài mép
  nhựa đường hiển thị.
- `games/race-2d.js`, `games/3d/race-view.js`: dựng đường cua/dốc; bánh quay theo
  quãng đường, chân theo nhịp đạp, thay đổi tư thế khi nước rút, nghiêng theo lái.
  Camera 3D bám mềm, nhìn trước khúc cua và mở góc nhẹ theo tốc độ. Mesh địa hình,
  cảnh vật và hạt hiệu ứng được tái sử dụng trong ván.
- `games/race.js`, `games/race.css`: giao diện, input, tiến trình, điểm và tùy chọn.
  `games/race-audio.js` quản lý âm thanh theo vòng đời game.

## Kiểm thử

Luật và các game dùng chung:

```powershell
node --test tests/race.test.cjs tests/arcade.test.js tests/lifecycle.test.js tests/core.test.js
```

Sau khi cài Playwright theo README, khởi động `npm start` rồi chạy:

```powershell
npm run test:race
npm run test:race:scene
```

Mặc định chạy Chromium (Edge trên Windows nếu có) và WebKit, ở cả 2D/3D:
desktop 1440×1000 và sáu viewport cảm ứng 320×740, 390×844, 744×1133,
1024×1366, 1180×820, 844×390, DPR 2–3. Kiểm tra tăng tốc, thả trôi, phanh,
lái, nước rút, tùy chọn, pause, restart, đóng/mở, giải phóng WebGL và tràn ngang.

Chromium dùng sự kiện cảm ứng qua CDP để giữ hai ngón đồng thời và hủy cảm ứng.
WebKit dùng chạm qua Playwright, giữ pointer cùng bàn phím, và phát
`pointercancel` cho pointer đã capture; không tuyên bố đã kiểm tra đa chạm phần
cứng trên WebKit. Phép đo giữ nút lấy thời gian mô phỏng làm mốc để tránh kết
quả sai khi trình duyệt headless render chậm.

Ảnh và báo cáo nằm tại `test-results/race`. Có thể đặt `TEST_URL`, `SCREENSHOTS`,
`RACE_BROWSERS=chromium`/`webkit`, `RACE_RENDERERS=2d`/`3d`,
`RACE_PROFILE=744x1133`, `RACE_SKIP_DESKTOP=1` hoặc `RACE_SKIP_MOBILE=1`.

`test:race:scene` dùng các trạng thái mẫu được dựng độc lập để kiểm tra renderer
WebGL ở mốc 0, 190, 440, 825 và 990 m: mặt đường không bị lật/mất, camera hữu
hạn, bánh/đạp đồng bộ, hạt nước bắn, giảm rung, nút camera và giải phóng GPU.
Ảnh ở `test-results/race-scene` là cảnh được đưa vào renderer, không phải
kết quả chơi hết chặng bằng thao tác người dùng.

Nếu máy có nhiều bản Playwright, biến `PLAYWRIGHT_MODULE` cho phép chọn đường
dẫn module khớp với các browser đã cài, cùng `PLAYWRIGHT_BROWSERS_PATH`.

Đây là kiểm thử trình duyệt headless trên Windows, mô phỏng viewport/DPR/touch;
không tạo máy ảo iPadOS và không thay thế kiểm tra trên iPhone/iPad thật.
