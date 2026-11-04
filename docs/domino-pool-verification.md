# Xác minh cải tiến Domino và Bida — 30/10/2026

Trạng thái: **đã triển khai, các kiểm tra chức năng đạt**. Thực hiện đợt 1 theo yêu cầu đã duyệt, đặc biệt Domino phải có nút gợi ý riêng và chỉ hiện gợi ý khi bấm. Báo cáo này không thay thế lịch sử xác minh Ma sói hoặc các task trước.

## Kết quả

- **Domino:** nút **Gợi ý nước đi** chỉ dùng trong lượt người chơi. Bấm nút mới hiện nước đề xuất và lý do; cần bấm **Đánh theo gợi ý** hoặc **Bỏ lượt theo gợi ý** để thực hiện. Có nút đóng. Chọn quân khác, thực hiện nước đi và chơi lại đều xóa gợi ý; lượt tiếp theo không tự hiện lại. Hàm gợi ý không sửa state, không đọc quân kín của đối thủ.
- **Domino 3D:** số quân các máy và hai đầu chuỗi nằm ngoài bảng điều khiển thu gọn. Quân trên tay vẫn có nút 2D lớn, bên cạnh khả năng chọn trong cảnh 3D. Các nút quân trên mobile rộng 52 px.
- **Bida:** thêm chỉnh góc 0,25° mỗi lần bấm, giữ nút để xoay, khóa/mở khóa hướng và hiển thị góc. Hủy pointer, mất focus hoặc tạm dừng ngắt thao tác giữ. Cú đánh/chơi lại tự mở khóa; đang lăn thì không chỉnh hướng hoặc đánh tiếp.
- **Bida 2D/3D:** dùng chung phép tính đường bi trắng và đoạn hướng bi mục tiêu màu vàng, có nút bật/tắt. Hướng dự kiến dừng ở vật cản/lỗ, không biểu diễn quãng đường dừng theo lực. Camera 3D nhìn cao hơn; khung mobile gọn và điều khiển sát bàn hơn.

Giữ nguyên luật thắng/thua, AI Domino, vật lý và điểm Bida. Chưa thêm trận cộng dồn, độ khó AI mới, luật 8-ball, thử lại cú đánh hoặc màn tập. Hướng dẫn: [Domino](domino.md), [Bida](pool.md).

## Bằng chứng kiểm tra

Runner: `node tests/domino-pool-harness.cjs <job> <nhãn-mới>`. Log và thời gian nằm trong [runs.json](../test-results/domino-pool-verification/runs.json); không dùng lại ngân sách task cũ.

| Kiểm tra | Kết quả | Bằng chứng |
| --- | --- | --- |
| Baseline trước sửa | pass, 66/66 | `unit baseline-unit`, exit 0; [log](../test-results/domino-pool-verification/baseline-unit.log). |
| Unit sau triển khai | pass, 77/77 | `unit implementation-unit`, exit 0; [log](../test-results/domino-pool-verification/implementation-unit.log). Gồm luật cũ, 300 ván Domino có seed, quyền riêng tư/read-only của gợi ý, hướng bi thẳng/cắt, bi gần nhất, băng/lỗ, tiếp tuyến và đối chiếu với va chạm thật. Có test adapter Ma sói để bảo vệ file chung. |
| Domino browser | pass, 6/6 cấu hình | [feature-browser/results.json](../test-results/domino-pool-verification/feature-browser/results.json): Domino ở 1280/390/320 px × 2D/3D. Lượt này dừng ở lỗi test đầu tiên của Bida, không phải toàn job đạt. |
| Bida browser | pass, 6/6 cấu hình tổng hợp | [pool-browser-round1/results.json](../test-results/domino-pool-verification/pool-browser-round1/results.json): 5 cấu hình đạt; sau sửa ngưỡng đo pixel, riêng 320 px 3D đạt tại [pool-mobile-round2/results.json](../test-results/domino-pool-verification/pool-mobile-round2/results.json). |
| Toàn bộ suite | pass, 434/434, exit 0 | `npm.cmd test -- --test-concurrency=1 --test-timeout=250000`; [final-suite.log](../test-results/domino-pool-verification/final-suite.log). Không bỏ test. Bảy test hướng ngắm mới được nạp từ `tests/arcade.test.js` để chạy với `npm test`. |
| Cú pháp JavaScript | pass, exit 0 | `npm.cmd run check`; [final-syntax.log](../test-results/domino-pool-verification/final-syntax.log). |
| Lint nếu có | không áp dụng | `package.json` không có script `lint`; không tự cài công cụ. |

Browser chạy Edge headless qua `file://` với dữ liệu cố định chỉ trong test, mô phỏng touch ở 390/320 px; không mở server phát triển. Mỗi báo cáo ghi phiên bản trình duyệt và `errors: []`. Các trường hợp bao phủ gợi ý không tự đánh, xác nhận, đóng/chọn thủ công, lượt kế tiếp, chơi lại; chọn quân 3D; bàn phím/chạm, ngắm/khóa/chỉnh lực, pointercancel, giữ nút qua pause, bắn/tạm dừng, đóng game và giải phóng cảnh 3D. Không có tràn ngang ở các kích thước đã kiểm tra.

Đã quan sát ảnh [gợi ý và quân tay Domino 3D 390 px](../test-results/domino-pool-verification/feature-browser/domino-3d-390.png), [Bida 3D 390 px](../test-results/domino-pool-verification/pool-browser-round1/pool-3d-390.png) và [Bida 2D 320 px](../test-results/domino-pool-verification/pool-browser-round1/pool-2d-320.png). Ảnh phần tử Domino nằm trong vùng cuộn nên phần trên bị cắt; kiểm tra hiển thị số quân/hai đầu được xác minh riêng bằng DOM. Đây là tương tác browser tự động và quan sát ảnh, chưa phải thử trên điện thoại vật lý hay nhiều engine trình duyệt.

## Hai vòng hiệu chỉnh trong giới hạn ba vòng

1. Browser gọi `inputValue()` trên `<output>` góc ngắm, khiến test dừng dù game đã render. Sửa test sang `textContent()`. Đồng thời tăng specificity bố cục Bida để CSS 3D nạp sau không ghi đè chiều cao riêng; chỉ chạy lại các cấu hình Bida chưa hoàn tất.
2. Ở Bida 3D 320 px, click vào tọa độ chiếu cho góc 20,75° so với khoảng 19,65° lý tưởng. Ngưỡng cố định 1° quá chặt khi pointer bị làm tròn theo CSS pixel. Test dùng ngưỡng góc tương đương 2 pixel tại khoảng cách chiếu và chạy lại đúng cấu hình bị lỗi. Không thay đổi code ngắm để làm test đạt.

Tất cả lỗi kiểm tra trên đã được xử lý; không có lỗi chức năng đang biết trong phạm vi đợt này. Không ghi các lượt fail thành pass hoặc xóa log cũ.

## Phạm vi và bàn giao

Mã sản phẩm thay đổi ở các file Domino, phần Bida trong `games/action.js`, `games/logic.js`, `games/3d/action-views.js`, CSS liên quan và một dòng `hide` trong adapter Domino. Không sửa engine, backend, `assets/` hoặc `index.html`. Các thay đổi Ma sói có trước phải giữ nguyên theo hash baseline; adapter Ma sói nằm trong file chung nhưng không bị sửa bởi task này.

`plan.md`, `checks.md`, `progress.md` và `CLAUDE.md` được cập nhật. [Diff CLAUDE của riêng task này](../test-results/domino-pool-verification/CLAUDE.diff) ghi quy tắc gợi ý chủ động, hình học chung, cách đọc output và dung sai pixel. Không tạo/sửa AGENTS.md, không cài gói, commit hoặc triển khai.

Tổng kiểm thử và audit: **221.690 ms (~3 phút 42 giây)**, dưới 30 phút; đã dùng **2/3 vòng hiệu chỉnh**. Trong đó kiểm thử là 218.733 ms, audit cuối 2.957 ms. [final-audit.json](../test-results/domino-pool-verification/final-audit.json) xác nhận 9 file Ma sói giữ nguyên SHA-256, file adapter chung chỉ khác đúng một dòng Domino, không đổi file ngoài phạm vi, các OUTPUT/liên kết tồn tại và `git diff --check` đạt. Không còn Node kiểm thử, Edge do Playwright tạo hoặc listener ở cổng 4173.
