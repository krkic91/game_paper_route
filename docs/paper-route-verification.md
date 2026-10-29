# Giao báo và đua xe đạp — cải tiến đợt 1

Trạng thái: đã triển khai và xác minh đợt đầu; còn timeout `npm test` mặc định.
Toàn suite đạt 414/414 khi chạy tuần tự. Người dùng đã duyệt triển khai đợt đầu và
phản hồi “tiếp tục” sau câu hỏi mở rộng các tệp giao báo ở thư mục gốc.

## Thay đổi đã triển khai

### Delivery Dash (2D và 3D)

- Nút **Ném trái / Ném phải** có thể dùng cùng thao tác lái/đạp. Giữ ném tự động
  bằng phím Space/chạm đường; 3D có thêm nút Ném tự động.
- Dòng trạng thái trên từng nút phân biệt mục tiêu trong tầm, ngoài tầm, báo đang
  bay, cooldown, hết báo và kết thúc. Màu vàng/xanh đi kèm chữ, không chỉ dựa vào màu.
- `games/delivery-guide.js` đọc GameCore.getTargetMailbox; dùng cùng cơ chế giữ
  hộp thư khi báo đang bay, không thay luật chọn mục tiêu hoặc điểm.
- Hết báo, cooldown, chưa bắt đầu/tạm dừng hoặc kết thúc thì khóa thao tác phù hợp.
- `game.js` không còn tính pointercancel/lostpointercapture thành một lần ném;
  phím Space trên nút không tạo đồng thời click nút và ném tự động.
- Tệp thay đổi: `delivery.html`, `delivery.css`, `game.js`, `games/delivery-guide.js`,
  `games/3d/delivery.js`, dòng tải helper trong `games/3d/loader.js` và CSS trong
  `games/3d/three.css`. Không sửa `core.js`.

### Đua xe đạp (2D và 3D)

- Chỉ báo núp gió sáng khi mô phỏng xác nhận hiệu ứng, tắt khi pause/kết thúc.
- Hiện hai điều kiện gần nhất trong tối đa 60 m phía trước: cua, dốc, đường trơn,
  sỏi hoặc đích; khoảng cách lấy từ chính trackAt, không sinh đường khác để cảnh báo.
- Hiện đối thủ gần nhất phía trước/sau, khoảng cách và thông tin đã về đích.
- Thanh tiến trình có bốn nhãn, tách hàng để vẫn đọc được khi các xe bám sát.
- `raceGuidance` chỉ đọc trạng thái, không thay lực, AI, năng lượng, điểm hay kết quả.
- Tệp thay đổi: `games/race-logic.js`, `games/race.js`, `games/race.css`.

Không làm combo, tuyến mới, huy chương hoặc bóng thành tích ở đợt này.
Giữ các thay đổi có sẵn của công việc 3D/Caro; không sửa server, package/lockfile,
cài dependency, commit hoặc triển khai.

## CHECKS và bằng chứng

Log/JSON/ảnh nằm tại `test-results/paper-route-verification/`; không dùng kết quả
lượt Caro làm kết quả cho bản code mới.

| Check | Verdict | Bằng chứng |
| --- | --- | --- |
| Unit ban đầu | pass — 82/82 | `baseline-unit.log`, exit 0, 1.531 giây. |
| Unit sau thêm hướng dẫn | pass — 86/86 | `feature-unit.log`, exit 0, 4.774 giây. |
| Browser cả hai game, 2D/3D | pass — 12/12 | `final-browser/results.json`, exit 0, 138.346 giây; chiều rộng 1280/390/320 px. |
| Nhãn tay đua không che nhau sau chỉnh CSS | pass — 4/4 | `final-layout/results.json`, exit 0, 50.394 giây; 2D/3D tại 390/320 px, kiểm tra bounding box nhãn không giao nhau. |
| `npm test` mặc định | unresolved — timeout | `final-test.log`: ngưỡng 360 giây, 362.982 giây gồm cleanup; runner exit 124. Không có tổng kết toàn suite. |
| `npm test -- --test-concurrency=1 --test-timeout=250000` | pass — 414/414 | `final-serial.log`, exit 0, không skip, 205.785 giây. Chỉ đổi lịch chạy file test; không coi là pass của lệnh mặc định. |
| `npm run check` | pass | `final-syntax.log`, exit 0, 40.063 giây. |
| `npm run lint` nếu có | Không áp dụng | Package hiện không có script lint; syntax không thay thế lint. |

Browser dùng Microsoft Edge 156.0.4314.50 / Chromium headless, mở trực tiếp `file://`, mô phỏng
viewport/cảm ứng. Không mở backend hoặc cổng 4173. Test tự đóng browser context
và trình duyệt; đóng game 3D kiểm tra không còn scene trong diagnostics.

### Những hành vi đã kiểm tra trong browser

- Nút ném trái làm hộp thư trái nhận báo; nút phải làm hộp thư phải nhận báo;
  giao hai hộp dùng đúng hai tờ. Hết báo khóa nút và hiển thị lý do.
- Hủy pointer sau pointerdown không tiêu hao báo trong bản 2D.
- Đua xe hiển thị trạng thái núp gió, đối thủ phía trước, cảnh báo đường trơn;
  pause dừng quãng đường và tắt chỉ báo hoạt động, resume tiếp tục.
- Chơi lại về intro, đóng game xóa cảnh 3D; không có pageerror trong lượt đạt.
- Không tràn ngang trong khối điều khiển và vùng chơi tại các viewport đã nêu.

Các trạng thái hộp thư/đối thủ trong test được dựng bằng fixture chỉ tồn tại trong
trình duyệt kiểm thử để kiểm chứng tình huống xác định. Đây không phải chứng cứ
chơi hết một tuyến bằng thao tác người dùng hoặc kiểm tra điện thoại thật.
Agent đã xem ảnh desktop/mobile để kiểm tra chữ, nút và bố cục. Phần vật lý và
thắng/thua dùng các unit test core/race/arcade/lifecycle hiện có.

### Các lượt không đạt được giữ lại

- `feature-browser`: fixture AI rời làn quá sớm, timeout khi chờ chỉ báo núp gió.
- `revised-browser`: bản 2D reset lại vật cản sau fixture; pointerdown tổng hợp
  với ID không tồn tại làm setPointerCapture ném lỗi; chờ kết quả ném timeout.
- Chỉnh fixture ở cả create/reset, dùng pointerdown thật và kiểm tra kết quả
  hộp thư nhận báo thay vì bắt frame ngắn của tờ báo đang bay. `final-browser` đạt.

Hai lỗi công cụ trên không được ghi thành lỗi server hay thay luật để lấy pass.

## Ngân sách và giới hạn

- Giới hạn 30 phút kiểm thử; mọi lượt kể cả fail/timeout được cộng vào
  [runs.json](../test-results/paper-route-verification/runs.json): 9 lượt, 882.715 giây.
  Thêm 1.757 giây xác nhận cleanup cuối: **884.472/1.800 giây** (14 phút 44.472 giây).
- Hai vòng sửa mã sản phẩm: xử lý hủy pointer; tách nhãn tay đua không chồng nhau.
- Chưa kiểm tra iPhone/iPad/Android vật lý, engine ngoài Chromium, các tuyến mới
  hoặc chơi toàn bộ tuyến bằng thao tác thật. Không suy diễn từ viewport giả lập.
- Handoff: [plan](../plan.md), [checks](../checks.md), [progress](../progress.md),
  [CLAUDE](../CLAUDE.md). Tái dùng `harness.xml`; không sửa AGENTS.md.
- Diff quy tắc: [CLAUDE-paper-route.diff](../test-results/paper-route-verification/CLAUDE-paper-route.diff).

Ảnh đã xem: [giao báo 2D mobile](../test-results/paper-route-verification/final-browser/delivery-2d-390.png),
[giao báo 3D mobile](../test-results/paper-route-verification/final-browser/delivery-3d-390.png),
[đua xe 3D mobile sau chỉnh nhãn](../test-results/paper-route-verification/final-layout/race-3d-390.png).

## Checklist bàn giao

- OUTPUT, plan, checks, progress, CLAUDE và diff quy tắc tồn tại, đọc được.
- Unit, browser, bố cục cuối, toàn suite tuần tự và syntax đã đạt; không có lint script.
- Timeout lệnh test mặc định được giữ rõ là unresolved, không bỏ test để lấy pass.
- `git diff --check` đạt; thay đổi ngoài task có sẵn được bảo toàn.
- [Cleanup cuối](../test-results/paper-route-verification/final-cleanup.json) không còn
  tiến trình test/browser của task hoặc listener tại 4173/4174/3000/8080.
- Không còn kiểm thử chạy nền; không mở server, cài dependency, commit hay triển khai.

## Chạy lại

`node tests/paper-route-harness.cjs unit|browser|test|serial|check <nhãn-mới>`
áp dụng ledger hiện tại; không ghi đè bằng chứng hoặc tự đặt lại ngân sách.
`PAPER_GAMES`, `PAPER_RENDERERS`, `PAPER_WIDTHS` chọn phần browser cần kiểm tra
ví dụ race / 3d / 390,320. Mặc định kiểm tra cả hai game, cả hai renderer và ba độ rộng.
