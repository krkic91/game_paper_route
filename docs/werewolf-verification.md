# Ma sói — cải tiến đợt 1, 30/10/2026

Người dùng duyệt “ok sửa giúp tôi nhé” cho đợt đầu. Đã triển khai và xác minh:
**423/423 test toàn suite tuần tự, 23/23 unit Ma sói, 1/1 adapter 3D, 6/6 lượt browser và syntax đều đạt.**

## Thay đổi

- Nghi ngờ / Bênh vực / Nhận vai trước bỏ phiếu, tối đa hai phát biểu mỗi ngày. Chọn người và lý do, xem trước nội dung; nhận Tiên tri có thể công bố kết quả soi. Lời nhận vai được ghi rõ chưa xác thực, không dò vai thật khi gửi.
- Máy phản hồi từ thông tin được phép biết; lời mới nhất tác động quyết định, lời lặp và phản hồi không cộng dồn ảnh hưởng. Có lý do từ phiếu đã công khai, lời nhận vai/kết quả soi mâu thuẫn. Kiến thức riêng của Tiên tri và đồng đội sói vẫn được ưu tiên.
- Bảng phiếu theo từng ngày, chỉ xuất hiện sau chốt vòng. Giữ cả hòa phiếu, số phiếu cao nhất và người bị loại; không mất ngày cũ khi sang đêm.
- Sửa adapter 3D đọc sai class: `is-dead` thành `is-eliminated`; xóa mô hình người bị loại, giữ ghế và nhãn “Đã bị loại”.

Không thêm vai mới hoặc dịch vụ bên ngoài. Luật đêm, hòa phiếu, thắng/thua và chế độ xem tự chạy giữ như phiên bản đang dùng.

## Kiểm chứng

| Check | Verdict | Bằng chứng trong test-results/werewolf-verification/ |
| --- | --- | --- |
| Baseline unit | pass | baseline-unit.log: 14/14, 1.341 giây |
| Tái hiện lỗi 3D | fail dự kiến | baseline-adapter.log: 8 mô hình thay vì 7, 0.317 giây |
| Unit bản mới | pass | feature-unit.log: 23/23, 2.768 giây; 400 ván có seed |
| Adapter sau sửa | pass | fixed-adapter.log: 1/1, 0.388 giây |
| Browser | pass | feature-browser/results.json: 6/6, 37.879 giây, không pageerror |
| Toàn suite tuần tự lần đầu | fail | final-serial.log: 422/423, exit 1, 108.668 giây; test giới hạn tài nguyên Caro không nhận SERVER_BUSY |
| Cô lập đúng test Caro không đạt | pass | online-isolated.log: 1/1, exit 0, 0.711 giây; không thay mã Caro |
| Toàn suite tuần tự xác nhận lại | pass | final-serial-recheck.log: 423/423, không skip, exit 0, 106.733 giây |
| Syntax | pass | final-syntax.log: exit 0, 30.481 giây |
| Lint nếu có | Không áp dụng | package.json không có script lint |

Browser chạy Edge headless qua file://, mô phỏng cảm ứng và viewport 1280/390/320 px.
Fixture chỉ tồn tại trong test: dựng ngày có lịch sử phiếu và giữ kết quả đối thủ xác định.
Người chơi vẫn bấm nút/chọn dropdown thật, và chọn ghế bằng tọa độ raycast ở bản 3D.
Kiểm tra luồng ngắn này không thay thế một ván đầy đủ bằng thao tác người thật trên điện thoại.
Các ván hoàn chỉnh được kiểm tra ở lớp logic bằng seed; chưa có đánh giá cân bằng tỷ lệ thắng mới.

Lượt toàn suite đầu không đạt ở `tests/online-server.test.cjs:249` (test giới hạn tài nguyên),
kỳ vọng SERVER_BUSY nhưng không có mã này trong phản hồi. Test cấu hình phòng hết hạn
sau 100 ms nên có khả năng nhạy thời điểm chạy; đây mới là giả thuyết, chưa xác định
nguyên nhân chắc chắn. Chạy riêng test này và toàn suite xác nhận đều đã đạt. Giữ cả log không đạt và log xác nhận,
không thay đổi server, test Caro hoặc bỏ test khỏi toàn suite.

Lệnh toàn suite thực tế: `npm test -- --test-concurrency=1 --test-timeout=250000`.
Chọn tuần tự ngay từ plan do các lượt cũ từng timeout khi chạy mặc định. Không báo
`npm test` mặc định đã chạy hoặc đã đạt trong lượt Ma sói này.

Đã xem ảnh [phát biểu 3D mobile](../test-results/werewolf-verification/feature-browser/speech-3d-390.png),
[bảng phiếu mobile](../test-results/werewolf-verification/feature-browser/votes-2d-390.png),
[người bị loại trong cảnh 3D](../test-results/werewolf-verification/feature-browser/scene-390.png).

## Bàn giao

- Nguồn: games/werewolf-logic.js, games/werewolf.js, games/werewolf.css, phần Ma sói trong games/3d/extended-tables.js.
- Kiểm thử: tests/werewolf.test.cjs, tests/werewolf-3d.test.cjs, tests/browser-werewolf.cjs và runner tests/werewolf-harness.cjs.
- Hướng dẫn: [werewolf.md](werewolf.md); [plan](../plan.md), [checks](../checks.md), [progress](../progress.md), [CLAUDE](../CLAUDE.md).
- Diff quy tắc: [CLAUDE-werewolf.diff](../test-results/werewolf-verification/CLAUDE-werewolf.diff). Không sửa AGENTS.md.
- Ledger: [runs.json](../test-results/werewolf-verification/runs.json): 9 lượt, tổng 289.286 giây; cleanup cuối 2.082 giây, cộng **291.368/1.800 giây** (4 phút 51.368 giây). Một vòng sửa lỗi 3D đã tái hiện trong giới hạn 3 vòng; không cần sửa bổ sung sau triển khai.
- OUTPUT, hướng dẫn và các metadata tồn tại, đọc được; các liên kết bằng chứng đã xác nhận. `git diff --check` đạt, 14 tệp thay đổi đúng phạm vi đã duyệt.
- [Cleanup cuối](../test-results/werewolf-verification/final-cleanup.json): không còn tiến trình test/browser/server hoặc listener trên 4173/4174/3000/8080. Browser không mở server; unit online dùng loopback tạm và đã kết thúc.
- Chưa thử điện thoại thật/engine ngoài Chromium hoặc đánh giá cân bằng dài hạn. Không commit, triển khai hoặc cài dependency.
