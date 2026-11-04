# Xác minh cải tiến Cờ tỷ phú — 01/11/2026

Task đã được duyệt bằng “ok làm cho tôi nhé”, áp dụng **4 đề xuất đầu**. Đã triển khai; kiểm tra riêng Cờ tỷ phú, giao diện, toàn suite ở lượt chạy lại và cú pháp đều đạt.

## Thay đổi

1. **Xem trước mua/xây:** hiển thị xu trước giao dịch, chi phí, xu còn lại, thuê trước/sau và thông báo hoàn thành nhóm. Cảnh báo còn dưới 160 xu chỉ mang tính tham khảo; giao dịch hợp lệ vẫn được thực hiện. Xem trước dùng cùng phép tính thuê và quyền nâng cấp với luật hiện hành, không chạy giao dịch hoặc đọc bộ thẻ/RNG.
2. **Đất của tôi:** bảng 7 nhóm A–G, số ô sở hữu 0/2–2/2, chủ đất còn thiếu, cấp công trình và các ô được xây trong lượt. Chọn ô chỉ mở thông tin và đưa tới phần xem trước/nút xác nhận; không tự mua/xây.
3. **3D/mobile:** vòng, lượt, xúc xắc và tổng bước nằm ngoài nguồn bàn bị thu gọn. Đất cấp 0 cũng có dải màu/huy hiệu chủ sở hữu; số 1–4 có chú giải tên ở ngoài bàn. Nút mua/bỏ qua đặt ngay dưới xem trước; xem trước xây nằm sát nút xây. Giữ thao tác chọn ô trên canvas và bằng danh sách.
4. **Dòng tiền/thanh lý:** bảng giao dịch ghi số thực trả và người nhận, số xu nhận/chi ngắn hạn cạnh người chơi, danh sách từng tài sản đã tự bán và tiền hoàn 50%. Tiền hoàn chỉ được cộng từ `credit`, không cộng thêm lần nữa từ mô tả `liquidation`. Trả nợ một phần khi phá sản chỉ cộng số thực nhận cho chủ đất.

Giữ nguyên luật, AI, điểm, số vòng, tiền và cách thanh lý tự động. Không thêm chọn tài sản bán, chọn độ dài ván hoặc lưu ván. Hướng dẫn: [docs/monopoly.md](monopoly.md).

## Kiểm tra và bằng chứng

Runner `node tests/monopoly-harness.cjs <job> <nhãn-mới>` có ngân sách riêng 30 phút, ghi log và [runs.json](../test-results/monopoly-verification/runs.json). Không đặt lại ledger cũ. Browser không cần backend.

| Kiểm tra | Verdict | Bằng chứng |
| --- | --- | --- |
| Baseline luật hiện có | pass | `unit baseline-unit`, 21/21, exit 0; [log](../test-results/monopoly-verification/baseline-unit.log). |
| Unit sau triển khai | pass | `unit implementation-unit`, 30/30, exit 0; [log](../test-results/monopoly-verification/implementation-unit.log). Các test này cũng được nạp từ `tests/monopoly.test.cjs` trong toàn suite. |
| Browser 2D/3D | pass | [feature-browser/results.json](../test-results/monopoly-verification/feature-browser/results.json): 6/6 ở 1280/390/320 px × 2D/3D. |
| 3D sau chỉnh huy hiệu | pass | [owner-badges-browser/results.json](../test-results/monopoly-verification/owner-badges-browser/results.json): 3/3 ở 1280/390/320 px, exit 0. Chỉ phần 3D bị ảnh hưởng bởi lượt chỉnh này. |
| Toàn suite lần đầu | fail | `npm.cmd test -- --test-concurrency=1 --test-timeout=250000`, 442/443, exit 1; [final-suite.log](../test-results/monopoly-verification/final-suite.log). Duy nhất test giới hạn tài nguyên Caro online lỗi expected `SERVER_BUSY`, actual `undefined`. |
| Cô lập lỗi Caro | pass | `node --test --test-name-pattern="room limit, rate limit" tests/online-server.test.cjs`, 1/1, exit 0; [resource-isolation.log](../test-results/monopoly-verification/resource-isolation.log). |
| Toàn suite chạy lại | pass | `npm.cmd test -- --test-concurrency=1 --test-timeout=250000`, **443/443**, exit 0, không bỏ test; [suite-recheck.log](../test-results/monopoly-verification/suite-recheck.log). Bao gồm test trình bày/adapter cuối sau sửa huy hiệu. |
| Cú pháp | pass | `npm.cmd run check`, exit 0; [final-syntax.log](../test-results/monopoly-verification/final-syntax.log). |
| Lint nếu có | không áp dụng | `package.json` không có script `lint`; không cài công cụ mới. |
| Phạm vi/cleanup | pass | [final-audit.json](../test-results/monopoly-verification/final-audit.json): 25 file có thay đổi từ task trước giữ nguyên hash, adapter game khác nguyên vẹn; không file ngoài phạm vi, output/liên kết tồn tại, diff check exit 0; không còn Node kiểm thử, Edge do Playwright tạo hoặc listener 4173. |

Unit bao gồm 300 ván có seed của luật cũ; các ca xem trước mua hoàn thành nhóm, mua một ô, vừa đủ/thiếu tiền, nâng cả hai cấp, hết lượt/kết thúc ván, portfolio không đọc thẻ kín, hóa đơn thanh lý có tổng thu/chi bằng nhau, trả thuê một phần khi phá sản, lương/mua/xây/phí tạm giữ và huy hiệu chủ đất cấp 0/sau xây/sau bán.

Browser dùng Edge headless qua `file://` và fixture cố định chỉ trong test, có mô phỏng chạm ở 390/320 px. Báo cáo JSON ghi version và `errors: []`. Đã kiểm tra mua/bỏ qua, xem trước không sửa state, chọn từ bảng đất không tự xây, Enter xác nhận xây, thiếu tiền khóa nút, chọn trực tiếp trên canvas 3D, cập nhật nhóm/chủ sau bán, tiền thuê thực nhận, pause/chơi lại/đóng, timer xu không chạy khi pause, không tràn ngang và không còn cảnh 3D sau đóng.

Đã quan sát ảnh [xem trước mua 390 px](../test-results/monopoly-verification/feature-browser/purchase-3d-390.png), [xem trước xây 390 px](../test-results/monopoly-verification/feature-browser/upgrade-2d-390.png), [bàn 3D cuối 320 px](../test-results/monopoly-verification/owner-badges-browser/owners-320.png), [chú giải/vòng/xúc xắc 320 px](../test-results/monopoly-verification/owner-badges-browser/turn-3d-320.png) và [thanh lý 320 px](../test-results/monopoly-verification/owner-badges-browser/sales-3d-320.png). Đây là kiểm tra browser tự động và quan sát ảnh, chưa phải thử trên điện thoại vật lý hoặc WebKit/Firefox.

## Hiệu chỉnh và lỗi ngoài phạm vi

- **Một vòng hiệu chỉnh giao diện:** chữ chủ đất dài trên ảnh 3D mobile quá nhỏ. Đổi sang huy hiệu số 1–4, thêm chú giải ngoài bàn và chạy lại cả ba kích thước 3D. Không thay đổi engine hoặc cơ chế picking.
- **Lỗi test Caro trong suite chung:** fixture ở `tests/online-server.test.cjs:245` đặt `idleMs=100`, lỗi xảy ra khi kỳ vọng phòng còn đầy nhưng phản hồi không có `SERVER_BUSY`. Cùng dạng lỗi từng xuất hiện ở báo cáo Ma sói. Chạy riêng và toàn suite lần hai đều đạt; điều này phù hợp với một vấn đề phụ thuộc thời gian/tải, chưa chứng minh một lỗi backend đã được sửa. Giữ nguyên backend và test Caro, ghi đủ cả lượt fail và lượt kiểm tra lại.

## Phạm vi và bàn giao

Mã sản phẩm chỉ đổi `games/monopoly-logic.js`, `games/monopoly.js`, `games/monopoly.css` và phần adapter Monopoly trong `games/3d/extended-boards.js`. Thêm test trình bày/browser/runner, cập nhật hướng dẫn và các tài liệu harness. Các thay đổi Ma sói, Domino/Bida có sẵn được lưu hash baseline để xác minh không bị ghi đè.

`CLAUDE.md` có quy tắc preview chỉ đọc, không tính tiền hoàn hai lần, số thực trả khi phá sản và cách trình bày chủ đất 3D trên mobile. [Diff CLAUDE riêng của task](../test-results/monopoly-verification/CLAUDE.diff). Không tạo/sửa AGENTS.md, không cài gói, commit, push hoặc triển khai; không mở server phát triển.

Giới hạn: tối đa 3 vòng hiệu chỉnh và 30 phút kiểm thử. Đã dùng **1 vòng chỉnh giao diện**; suite chung chạy 2 lần và một lượt cô lập lỗi. Tổng thời gian **361.771 ms (~6 phút 2 giây)**, gồm 358.179 ms kiểm thử và 3.592 ms audit. `plan.md`, `checks.md`, `progress.md` đã cập nhật; không có kiểm tra bắt buộc đang chờ. Lỗi phụ thuộc thời gian của test Caro được giữ trong lịch sử bằng chứng, không được báo là đã sửa backend.
