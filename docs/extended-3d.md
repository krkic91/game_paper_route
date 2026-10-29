# 41 game có cả bản 2D và 3D

Đã bổ sung 31 phiên bản còn thiếu. Chọn **Chơi 3D** trên thẻ game, nút **3D** trong màn chơi, hoặc mở `index.html#play/chess/3d` trực tiếp. Không cần build, CDN hay mở cổng máy chủ để chơi tại chỗ. Caro online vẫn cần máy chủ như trước.

| Nhóm | Phiên bản vừa thêm |
| --- | --- |
| Bàn cờ | Cờ vua, Cờ tướng / mode Cờ úp, Cờ đam, Cờ gánh, Cờ lật, Cờ Thú, Hải chiến, Cờ tỷ phú |
| Bài và quân | Sâm lốc, Mậu binh, Phỏm, Tiến lên, UNO, Xì dách, Domino |
| Giải đố và thư giãn | Sudoku, Xếp cún, Dò mìn, Nối thú, Ghép 3, Jigsaw, Tô màu, Đuổi hình bắt chữ, Nối chữ |
| Chuyển động và suy luận | Xếp gạch, Thủ thành, Piano, Luân lưu, Câu cá, Ma sói, Neon Survivors |

Mỗi quân, ô, lá bài hoặc nhân vật là vật thể WebGL. Bàn cờ dùng các quân dựng bằng hình học; tranh tô màu và mảnh jigsaw được tạo khối từ đường SVG gốc. Các game chữ hiển thị hình gợi ý / thẻ chữ trên bàn 3D, giữ ô nhập chữ bên dưới. Neon dùng mô hình instanced để vẽ nhiều quái, đạn, ngọc và hiệu ứng cùng lúc.

Chạm vật thể để chơi. Các nút xác nhận, gợi ý, xếp bài, nhập chữ và lựa chọn vẫn nằm bên cạnh hoặc phía dưới bàn. Jigsaw dùng chọn mảnh rồi chọn ô. Có bàn điều khiển dễ truy cập để dùng giao diện ô/quân gốc khi cần. Nút camera hỗ trợ nhìn từ trên, phóng to và thu nhỏ; các bàn có thể xoay bằng Shift + kéo / chuột phải. Các game cần hướng điều khiển cố định giới hạn xoay. Neon có nút riêng đổi giữa góc 3D và từ trên, dùng lựa chọn đồ họa sẵn có trong game.

Luật, máy chơi, đồng hồ, kết quả và thao tác được dùng chung với bản 2D. Lớp 3D chỉ đọc phần hiển thị công khai: không đọc bài đối thủ, tàu chưa tìm thấy, quân Cờ úp chưa lật hay danh tính bí mật của Ma sói. Riêng Thủ thành và Xếp gạch truyền trạng thái công khai trực tiếp cho renderer thay vì phân tích ảnh canvas.

Kỷ lục 2D và 3D lưu riêng. Tranh tô màu 3D cũng lưu riêng, tránh tự nhận điểm từ tranh đã hoàn tất ở bản 2D. Kho câu đã giải, bộ sưu tập cá và nâng cấp Neon vẫn dùng tiến độ lâu dài của game. Tạm dừng sẽ dừng cả luật chơi lẫn vòng vẽ; đóng game hủy observer, listener, texture, geometry và WebGL context. Nếu thiết bị không hỗ trợ WebGL 2 hoặc mất kết nối GPU, có nút chuyển sang 2D / thử lại.

## Mã nguồn

- `games/3d/extended.js`: kết nối lifecycle của game gốc với scene, đồng bộ vật thể, texture chữ và raycast.
- `extended-boards.js`, `extended-tables.js`, `extended-puzzles.js`, `extended-live.js`: cách bố trí và mô hình từng game.
- `games/3d/neon-view.js`: renderer trong iframe Neon, tải Three cục bộ khi yêu cầu bản 3D.
- `games/3d/extended.css`: bố cục responsive quanh bàn và các điều khiển gốc.

## Kiểm tra không mở server

```powershell
npm.cmd test
npm.cmd run check
npm.cmd run test:3d:expanded
$env:LOADER_BROWSERS = 'chromium'
$env:LOADER_CASES = 'all-games-file,all-3d-file'
node tests/browser-loader.cjs
```

Kiểm thử mở tất cả 31 phiên bản mới bằng `file://`, kiểm tra raycast và thay đổi trạng thái, tạm dừng, khởi động lại, camera, giao diện hẹp, chuyển phiên bản, điểm riêng và giải phóng GPU. Ảnh và báo cáo lưu trong `test-results/extended-3d/` (không đưa vào Git). Môi trường tự động là Edge/Chromium headless với viewport cảm ứng mô phỏng; không thay thế việc chạy trên điện thoại thật.

Kết quả xác nhận: 405/405 kiểm thử luật và lifecycle; 93 kịch bản 3D cho 31 game ở 1366, 390 và 320 px; thêm 13 kịch bản chạm trực tiếp ở 320 px. Đã kiểm tra Neon với 120 quái thuộc đủ sáu loại và tất cả vũ khí cấp 5, khôi phục sau mất GPU, và chuyển về 2D khi WebGL bị tắt. Cả 41 game 2D và 10 bản 3D cũ vẫn tải được offline; kiểm thử Tô màu 2D (3 kích thước và lưu trữ bị chặn) cùng Neon 2D (5 kịch bản) đều đạt. Kiểm tra cú pháp và `git diff --check` đạt. Cổng 4173 không được mở trong đợt triển khai này.
