# Quy tắc dự án ghi nhận từ harness

## Cờ tỷ phú

- Runner `node tests/monopoly-harness.cjs unit|browser|serial|check <nhãn-mới>` giữ ledger/log riêng ở `test-results/monopoly-verification/`, tổng tối đa 30 phút; browser chạy file://. Không dùng ngân sách các task cũ.
- Preview mua/xây phải chỉ đọc và dùng cùng `rent`/`legalUpgrades` với luật giao dịch; không đọc thứ tự thẻ hoặc RNG. Cảnh báo dưới 160 xu chỉ là gợi ý ngân quỹ, không thêm điều kiện cấm mua/xây. Nút từ bảng tài sản chỉ mở thông tin; giao dịch vẫn qua `act`.
- Dòng tiền chỉ cộng `credit`/`payment`. `liquidation.amount` là thông tin hóa đơn; tiền hoàn đã nằm trong `credit`, cộng lại sẽ sai sổ xu. Khi phá sản, chủ đất chỉ nhận `payment.amount`, không nhận `required` chưa được trả.
- Thông tin vòng/xúc xắc phải ở ngoài nguồn DOM bị adapter 3D thu gọn. Chủ đất cấp 0 vẫn cần dấu nhận biết. Trên mobile dùng huy hiệu số 1–4 với chú giải tên ngoài bàn thay vì chữ dài rất nhỏ; kiểm tra ảnh 320 px và picking sau thay đổi mô hình.

## Domino / Bida

- Runner `node tests/domino-pool-harness.cjs unit|browser|serial|check <nhãn-mới>` giữ log và ledger riêng ở `test-results/domino-pool-verification/`, tối đa 30 phút. Browser dùng file://, không mở server.
- Domino chỉ gọi `suggestMove` khi người dùng bấm nút Gợi ý; việc hiển thị gợi ý không được gọi `applyAction`. Xóa gợi ý khi chọn quân/đổi lượt/chơi lại. Không đọc quân đối thủ để giải thích nước đi.
- Bida dùng chung `poolAim` cho 2D/3D. Đường bi mục tiêu là đoạn hướng ngắn bị chặn bởi bi/băng/lỗ, không phải quãng đường dừng theo lực. Giữ vật lý độc lập với hướng dẫn.
- Browser: đọc `<output>` bằng textContent hoặc thuộc tính value, không dùng locator.inputValue. Khi đối chiếu góc ngắm ở viewport nhỏ, tính sai số góc từ số CSS pixel và khoảng cách chiếu; ngưỡng độ cố định có thể báo sai vì tọa độ pointer bị làm tròn.
- CSS riêng của Bida phải có specificity cao hơn `.three-workspace .game-board-area` vì stylesheet 3D nạp sau. Kiểm tra chiều cao thực và tràn ngang ở 320/390 px.

## Ma sói

- Chạy `node tests/werewolf-harness.cjs unit|adapter|browser|serial|check <nhãn-mới>` để giữ ledger riêng tại `test-results/werewolf-verification/`, tổng tối đa 30 phút. Không ghi đè nhãn hoặc dùng lại ngân sách task cũ.
- Lý do thảo luận chỉ lấy từ `view` đã lọc. Nhận vai/công bố soi là lời nói có thể sai, không xác thực bằng vai bí mật. Chỉ đưa phiếu vào lịch sử công khai sau khi chốt cả vòng.
- Adapter Ma sói 3D đọc trạng thái `is-eliminated` từ UI. Khi sửa trạng thái hoặc nhãn ở UI, chạy cả unit adapter và browser 2D/3D; giữ thông tin người bị loại bằng chữ ngoài màu sắc.

## Giao báo / đua xe

- `node tests/paper-route-harness.cjs unit|browser|test|serial|check <nhãn>` giữ
  log và ledger riêng tại `test-results/paper-route-verification/`, tổng 30 phút,
  không ghi đè nhãn cũ. Browser kiểm tra file://, tự đóng trình duyệt, không cần server.
- Hướng dẫn mục tiêu phải dùng cùng luật chọn hộp thư, không chọn lại hộp thư đã
  được giữ bởi báo đang bay. Núp gió/cảnh báo đường đọc mô phỏng, không đổi vật lý.
- Kiểm tra pointercancel trên một pointer đã bắt đầu thật; sự kiện pointerdown
  tổng hợp với ID tùy ý có thể làm setPointerCapture ném lỗi, không chứng minh lỗi game.
- Fixture Delivery phải xử lý cả createGameState lẫn resetGameState; bản 2D gọi
  reset ngay khi tải. Đối với hành động ngắn, kiểm tra kết quả bền vững (hộp thư hit)
  thay vì chờ bắt đúng frame của tờ báo đang bay trên máy render chậm.

- Khi chạy harness, đọc `plan.md`, `progress.md`, `checks.md` và nguồn liên quan trước.
  Tuân thủ SCOPE và ngân sách đã duyệt; không đặt lại số vòng/thời gian khi tiếp tục.
- `npm.cmd test` trên PowerShell tương đương `npm test`; `npm.cmd run check`
  kiểm tra cú pháp JavaScript. Chỉ chạy lint khi package có script tương ứng.
- Bảo toàn thay đổi có sẵn trong worktree; không reset/revert để làm sạch baseline.
- Kiểm tra game offline qua `file://` khi không cần backend. Unit test online dùng
  cổng loopback tạm và phải đóng sau kiểm thử. Không tự để server phát triển chạy nền.
- Chỉ ghi pass khi có bằng chứng thực tế. Phân biệt tự động, quan sát trực quan qua
  ảnh và kiểm tra thủ công/thiết bị thật; thiếu phương tiện thì ghi unresolved.
- Harness 2048: `node tests/2048-harness.cjs test|check|unit|browser <nhãn>` lưu
  log/thời lượng vào `test-results/2048/`, áp dụng ngân sách 30 phút và timeout
  từng tiến trình, dọn cây tiến trình do nó tạo khi timeout. Không dùng ledger 2048
  để ghi đè lịch sử của task khác.
- Với PowerShell trên Windows, tránh nhúng JavaScript nhiều dấu nháy kép vào
  `node -e`: việc truyền argv có thể làm mất dấu nháy. Dùng file script hoặc
  biểu thức `node -p` với dấu nháy đơn bên trong cho thao tác đọc đơn giản.

## Harness Caro online

- `node tests/caro-harness.cjs test|check|online|browser <nhãn>` lưu log và tổng
  thời gian trong `test-results/caro-online-verification/runs.json`. Chạy tuần tự;
  dùng nhãn mới, không ghi đè bằng chứng hoặc đặt lại ngân sách giữa các phiên.
- `tests/browser-online-pair.cjs` mở backend thật trên loopback/cổng ngẫu nhiên,
  dùng Edge và Chrome hệ thống; `tests/helpers/caro-browser-server.cjs` đóng PID
  do nó tạo và xác minh cổng đóng. Không để `npm start` chạy nền chỉ để test.
- Hai browser context độc lập không đồng nghĩa hai ứng dụng/engine khác nhau.
  Ghi executable, version và cách tách storage. Edge + Chrome đều dùng Chromium.
- `tests/caro-manual.cjs` nhận các hành động do người điều khiển chọn, ghi ảnh và
  transcript đã bỏ token. Phiên có timeout vẫn được tính vào tổng thời gian;
  nếu gián đoạn, đọc ledger/cleanup trước khi tiếp tục, không tự reset budget.
- Các test timeout/reconnect trong `tests/online-client.test.cjs` dùng đồng hồ
  điều khiển thay cho chờ 8 giây thực. Khi mất ACK, xác minh resume lấy bàn server,
  không phát lại nước đi chưa rõ đã được chấp nhận, và bỏ qua socket cũ.
- Phân biệt timeout công cụ với lỗi sản phẩm; chỉ sửa lỗi tái hiện có bằng chứng.
  Nếu không tái hiện được, báo phạm vi đã kiểm tra và giới hạn, không tuyên bố đã sửa.
- Khi PowerShell đọc JSON array để thêm ledger, kiểm tra lại cấu trúc trước khi
  lưu: Windows PowerShell có thể giữ toàn bộ array như một phần tử trong `@(...)`.
  Ledger phải là mảng phẳng các object có `label` và `durationMs` hữu hạn; không
  để mảng lồng hoặc wrapper `{value, Count}` làm hỏng tổng ngân sách. Giữ nguyên
  mọi lượt chạy cũ khi sửa cấu trúc.
- Nếu full suite chậm trong môi trường hiện tại, có thể cô lập tải đồng thời bằng
  `npm test -- --test-concurrency=1 --test-timeout=250000` trong ngân sách còn lại.
  Ghi rõ cờ thực tế, số test và lượt timeout trước; không bỏ test hoặc báo cấu hình
  mặc định đã đạt chỉ vì lượt tuần tự đạt.
